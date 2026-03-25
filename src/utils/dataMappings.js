export const RELIGION_MAP = {
    '1': 'Hindu',
    '2': 'Christian',
    '3': 'Muslim',
    '4': 'Other'
};

export const CASTE_MAP = {
    '1': 'Nadar',
    '2': 'Other'
};

export const EDUCATION_MAP = {
    '1': 'Engineer',
    '2': 'Doctor',
    '3': 'Lawyer',
    '4': 'Master Degree',
    '5': 'Master Degree With B.Ed',
    '6': 'Degree With B.Ed',
    '7': 'Degree',
    '8': 'Diplamo',
    '9': 'ITI',
    '10': 'HSC',
    '11': 'SSLC',
    '12': 'School',
    '34': 'Auditor',
    '35': '8th'
};

export const OCCUPATION_MAP = {
    '1': 'Programmer',
    '2': 'Bank',
    '3': 'Private',
    '4': 'Project Manager',
    '5': 'Lecturer',
    '6': 'Asst Professor',
    '7': 'Mechanical Engineer',
    '8': 'Engineer Marketing',
    '9': 'Technical Officer',
    '10': 'Legal Services',
    '11': 'Manufacturing / Distributions',
    '12': 'Medical / Health Services',
    '13': 'Politics / Government / Military',
    '14': 'Real Estate',
    '15': 'Sales / Marketing',
    '16': 'Science',
    '17': 'Technical / Engineering',
    '18': 'Transportation',
    '19': 'Food Service',
    '20': 'Other',
    '21': 'Software Engineer',
    '22': 'NoJob',
    '23': 'Railway Department',
    '24': 'Business',
    '25': 'Civil Engineer'
};

export const LOCATION_MAP = {
    '1': 'Chennai',
    '2': 'Madurai',
    '3': 'Coimbatore',
    '4': 'Trichy',
    '5': 'Salem',
    '6': 'Tirunelveli',
    '7': 'Thoothukudi',
    '26': 'Thoothukudi' // Assuming 26 based on common districts list
};

export const getLabel = (map, value, fallback = '') => {
    if (!value) return fallback;
    // If value is already text (not numeric string), return it
    if (isNaN(value)) return value;

    // Check map
    if (map[value.toString()]) {
        return map[value.toString()];
    }

    return fallback || value; // Return value if no fallback, or fallback
};
