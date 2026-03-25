# NewMatrimonyApp — End-to-End Workflow (Top to Bottom)

This document describes the **complete app flow** from startup to all major features, including **conditions**, **returns**, and **data sources** (local storage vs backend).

---

## 1) App startup (boot)

### 1.1 Entry point
- **`index.js`** registers the root component.
- **`App.tsx`** is intentionally empty; the actual root is **`App.jsx`**.

### 1.2 Root wrapper
**`App.jsx`** mounts:
- **`SafeAreaProvider`**: safe-area handling
- **`NetworkStatus`**: global connectivity blocker/banner
- **`AppNavigator`**: navigation stack for all screens

### 1.3 Connectivity handling (global)
**`NetworkStatus.jsx`**
- If **offline** (`NetInfo.isConnected === false`)
  - Shows **full-screen “No Connection”** UI (blocks the whole app)
  - User can tap **Try Again** which re-checks network.
- If **restored**
  - Shows a short **“Back online”** banner then hides.

**Return/Result:** app UI is available only when online (offline screen blocks).

---

## 2) Navigation structure

**`src/navigation/AppNavigator.jsx`** defines a single native stack:
- `Main`
- `Register`
- `Profiles`
- `ProfileDetails`
- `Search`
- `Contact`
- `ViewedProfiles`
- `SelectedProfiles`
- `ViewHoroscope`

All screens run with:
- `headerShown: false`
- `animation: 'none'`

---

## 3) Session model (local storage truth)

**`src/utils/session.js`** is the central place for AsyncStorage keys and helpers.

### 3.1 Storage keys (important)
- `userSession` (boolean string `'true'` / missing)
- `userData` (JSON string)
- `tamil_client_id` / `client_id` / `username`
- `selected_profiles_list` (local sync cache of selections)
- `viewed_profiles_list` (local sync cache of viewed full details)

### 3.2 Login state check
`isLoggedIn()` returns true iff:
- `AsyncStorage.getItem('userSession') === 'true'`

### 3.3 On successful login
`setSession(data)` does:
- Clears old lists:
  - `selected_profiles_list`
  - `viewed_profiles_list`
- Stores:
  - `userSession = 'true'`
  - `userData = JSON.stringify(data + no_sel_profiles reset)`
  - client IDs + username (if present)

### 3.4 On logout
`clearSession()` removes all session keys.

---

## 4) Main screen flow (guest vs logged-in)

**Screen:** `src/screens/MainScreen.jsx` (route name `Main`)

### 4.1 On mount
Calls `checkSession()` → sets `isLoggedIn`:
- `null` while loading
- `false` if session missing
- `true` if session exists

### 4.2 What renders
If:
- `activeTab === 'HOME'` **and** `isLoggedIn === true`
  - **Render:** `Dashboard`
Else:
  - **Render:** `HomeScreen` (landing/guest experience)

### 4.3 Footer “login wall” (tab gating)
Footer logic:
- HOME is always accessible
- For tabs `CONTACT`, `SEARCH`, `PROFILE`:
  - If **NOT logged in** → opens **Login modal**
  - If **logged in** → navigates to corresponding screen

**Return/Result:** user can browse HOME as guest; other areas require login.

---

## 5) Authentication flow (Login)

### 5.1 UI
Login is a modal in `MainScreen.jsx`.

### 5.2 API call
Service: **`src/services/authService.js`**
- `loginUser(profileId, password)`
- Sends `POST` to: `ENDPOINTS.LOGIN` (`/api/login.php`)

Important:
- Adds bot-protection cookie header:
  - `Cookie: humans_21909=1`

### 5.3 Success / failure
If API returns:
- `{ status: true, data: ... }`
  - App calls `setSession(data)`
  - Closes modal
  - `isLoggedIn = true`
- `{ status: false, message: ... }`
  - App shows alert with message

---

## 6) Registration flow (Register)

**Screen:** `src/screens/auth/RegisterScreen.jsx`

### 6.1 Steps
- Step 0: Terms → Accept → Step 1
- Step 1: Basic details validation
- Step 2: Work/Family + email + OTP
  - `send_otp` → show OTP input
  - `verify_otp` → proceed if valid
- Step 3: Photos + optional horoscope upload
- Step 4: Success screen → reset navigation to `Main (HOME)`

### 6.2 Key conditions
- At least **1 photo is required**
- Image size guard: **<= 500KB**
- Email must contain `@` (basic validation)

**Return/Result:** registration stores data on backend; password is mailed.

---

## 7) Profiles browsing (Matches)

**Screen:** `src/screens/profile/Profile.jsx` (route name `Profiles`)

### 7.1 Data source
Calls `getUserProfiles(tamilClientId)` to load profile cards.

### 7.2 Backend Sync Shortlist (“Selected Profiles”)
When user taps **Select** on a card:
- App calls backend API: `selectProfile(myId, targetId)` using `action=select_profile`.
- Backend strictly records the selection and returns the updated `selected_count`.
- App updates local AsyncStorage `selected_profiles_list` to maintain speed/offline resilience.
- Updates `userData.no_sel_profiles` to match the API count.
- Updates in-memory set so UI reflects immediately.

**Important:** this shortlist is **hybrid synced**, meaning the backend is the authoritative source, and local storage optimizes navigation.

### 7.3 “View details” gating (membership view limit)
Before navigating to details:
- App checks if profile already in `viewed_profiles_list`
- If user plan is Basic (`mem_plan === '0'`)
  - If `viewed_profiles >= 50` and NOT already viewed
    - Blocks navigation and prompts upgrade

---

## 8) Full profile detail view (Selection gating & Logic)

**Screen:** `src/screens/profile/ProfileDetails.jsx` (route name `ProfileDetails`)

This screen imposes a **Strict Sensitive Data Gate**. Photo viewers, phone numbers, and exact place locations are locked behind the `isSelected` state.

### 8.1 Fetch full profile data
Calls:
- `getProfile(profileId)` → merges into local `profileData`

### 8.2 The 3-Layer Selection Check
To ensure instant UI feedback while guaranteeing authoritative source truth, `ProfileDetails` employs 3 layers of verification:
- **Layer 1: Route Params** (Checks if the user clicked "View Profile" from a pre-selected card, instant render)
- **Layer 2: AsyncStorage Cache** (Scans the local `selected_profiles_list` for quick loading without network wait)
- **Layer 3: Backend Authoritative Verification** (Calls backend `action=get_selected_profiles` to securely verify status)

Only when Selection is confirmed, the app triggers `Profile Selected` state, granting access to private data.

### 8.3 Photo Display & Imunify360 Bypass
Due to strict bot-protection on nadarmahamai.com, native `<Image />` fails with a `409 Conflict`.
- A dedicated `<ImageWithCookie />` intelligently pre-fetches the image manually including a `Cookie: humans_21909=1` header.
- The binary response parses as Base64 format and correctly loads into `<Image source={{ uri: b64 }} />`.
- An interactive `<Modal />` overlay operates as an aesthetic fullscreen photo gallery.

---

## 9) Dashboard (counts + selected section)

**Screen:** `src/screens/Dashboard.jsx`

On focus:
- Reads `userData` from storage
- Calls:
  - `getProfile(id)`
  - `getDashboardStats(id)`
  - `getSelectedProfiles(id)` (backend list of full-detail-viewed profiles)
- Updates local `userData` and stores back

### 9.1 What the dashboard should show
Two different concepts:
- **Selected Profiles (shortlist)** → local AsyncStorage list length
  - shown as `userData.no_sel_profiles`
- **Viewed Profiles (full-detail views)** → backend `selected_profiles_count` / or local `userData.viewed_profiles`

### 9.2 Key condition returns
- If storage/session missing → dashboard won’t show (Main shows guest landing)
- If network fails → offline screen blocks app

---

## 10) Selected Profiles screen

**Screen:** `src/screens/profile/SelectedProfiles.jsx`

Data source:
- Calls backend `action=get_selected_profiles` payload on `selected-profiles.php` to fetch all authenticated choices.
- Maps the data intelligently and supplements cache if needed.

Header count:
- Driven organically via `<PageHeader>` mirroring the data.

---

## 11) Viewed Profiles screen

**Screen:** `src/screens/profile/ViewedProfiles.jsx`

Data source:
- Explicitly queries backend `action=get_viewed_profiles` to fetch exact backend history context.

---

## 12) API summary (what is called where)

- **Login**: `/api/login.php` (`authService.loginUser`)
- **Register/OTP/Dropdowns**: `/api/register.php` (Register screen actions)
- **Full profile**: `/api/profile.php` (`profileService.getProfile`)
- **Profile list**: `/api/userProfile.php` (`profileService.getUserProfiles`)
- **Dashboard stats**: `/api/get-profile.php` (`profileService.getDashboardStats`)
- **Viewed insertion + viewed list**: `/api/selected-profiles.php`
  - `action=view_profile` → insert into `selected_profiles_count`
  - `action=get_selected_count` → returns backend viewed_count
  - `action=get_selected_profiles` → returns backend viewed list

---

## 13) Key “conditions and returns” (cheat sheet)

- **Offline**
  - Condition: `isConnected === false`
  - Return: offline screen blocks app

- **Login required**
  - Condition: user taps footer tab other than HOME and `isLoggedIn === false`
  - Return: login modal opens

- **Basic plan view limit**
  - Condition: `mem_plan === '0'` AND `viewed_profiles >= 50` AND profile not already viewed
  - Return: blocks detail screen; prompts upgrade

- **Duplicate full-detail view**
  - Condition: backend already has `(user_id, views_list)` row
  - Return: backend does not insert; app still treats as viewed

- **Shortlist vs Viewed Context**
  - Shortlist (“Selected Profiles”) queries API directly and is treated as a severe gated lock opening phone/photos.
  - Full-detail “viewed” queries API explicitly displaying historical logs.

