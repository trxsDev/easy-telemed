// Profile Form Constants
export const FORM_STEPS = [
  {
    title: 'Basic Information',
    description: 'Personal details and contact information',
    key: 'basic'
  },
  {
    title: 'Physical Information', 
    description: 'Height, weight, and physical characteristics',
    key: 'physical'
  },
  {
    title: 'Medical History',
    description: 'Medical conditions, allergies, and medications',
    key: 'medical'
  },
  {
    title: 'Lifestyle',
    description: 'Lifestyle habits and preferences',
    key: 'lifestyle'
  },
  {
    title: 'Preferences',
    description: 'Communication and healthcare preferences',
    key: 'preferences'
  }
]

// Basic form options
export const SEX_AT_BIRTH_OPTIONS = [
  { value: 'male', label: 'MALE' },
  { value: 'female', label: 'FEMALE' },
  { value: 'intersex', label: 'INTERSEX' }
]

export const LANGUAGE_OPTIONS = [
  { value: 'th', label: 'THAI' },
  { value: 'en', label: 'ENGLISH' }
]

export const RELATIONSHIP_OPTIONS = [
  { value: 'spouse', label: 'SPOUSE' },
  { value: 'parent', label: 'PARENT' },
  { value: 'child', label: 'CHILD' },
  { value: 'sibling', label: 'SIBLING' },
  { value: 'friend', label: 'FRIEND' },
  { value: 'other', label: 'OTHER' }
]

// Thai provinces
export const THAI_PROVINCES = [
  'Bangkok',
  'Amnat Charoen',
  'Ang Thong',
  'Bueng Kan',
  'Buriram',
  'Chachoengsao',
  'Chai Nat',
  'Chaiyaphum',
  'Chanthaburi',
  'Chiang Mai',
  'Chiang Rai',
  'Chonburi',
  'Chumphon',
  'Kalasin',
  'Kamphaeng Phet',
  'Kanchanaburi',
  'Khon Kaen',
  'Krabi',
  'Lampang',
  'Lamphun',
  'Loei',
  'Lopburi',
  'Mae Hong Son',
  'Maha Sarakham',
  'Mukdahan',
  'Nakhon Nayok',
  'Nakhon Pathom',
  'Nakhon Phanom',
  'Nakhon Ratchasima',
  'Nakhon Sawan',
  'Nakhon Si Thammarat',
  'Nan',
  'Narathiwat',
  'Nong Bua Lamphu',
  'Nong Khai',
  'Nonthaburi',
  'Pathum Thani',
  'Pattani',
  'Phang Nga',
  'Phatthalung',
  'Phayao',
  'Phetchabun',
  'Phetchaburi',
  'Phichit',
  'Phitsanulok',
  'Phrae',
  'Phuket',
  'Prachinburi',
  'Prachuap Khiri Khan',
  'Ranong',
  'Ratchaburi',
  'Rayong',
  'Roi Et',
  'Sa Kaeo',
  'Sakon Nakhon',
  'Samut Prakan',
  'Samut Sakhon',
  'Samut Songkhram',
  'Sara Buri',
  'Satun',
  'Sing Buri',
  'Sisaket',
  'Songkhla',
  'Sukhothai',
  'Suphan Buri',
  'Surat Thani',
  'Surin',
  'Tak',
  'Trang',
  'Trat',
  'Ubon Ratchathani',
  'Udon Thani',
  'Uthai Thani',
  'Uttaradit',
  'Yala',
  'Yasothon'
]

// Medical conditions
export const COMMON_CONDITIONS = [
  'Diabetes',
  'Hypertension',
  'Heart Disease',
  'Asthma',
  'COPD',
  'Arthritis',
  'Depression',
  'Anxiety',
  'Migraine',
  'Epilepsy',
  'Thyroid Disease',
  'Kidney Disease',
  'Liver Disease',
  'Cancer',
  'Stroke',
  'High Cholesterol',
  'Osteoporosis',
  'Sleep Apnea',
  'GERD',
  'IBS',
  'Other'
]

// Smoking status options
export const SMOKING_STATUS_OPTIONS = [
  { value: 'never', label: 'NEVER_SMOKED' },
  { value: 'former', label: 'FORMER_SMOKER' },
  { value: 'current', label: 'CURRENT_SMOKER' }
]

// Alcohol consumption options
export const ALCOHOL_CONSUMPTION_OPTIONS = [
  { value: 'never', label: 'NEVER' },
  { value: 'rarely', label: 'RARELY' },
  { value: 'occasionally', label: 'OCCASIONALLY' },
  { value: 'weekly', label: 'WEEKLY' },
  { value: 'daily', label: 'DAILY' }
]

// Exercise frequency options
export const EXERCISE_FREQUENCY_OPTIONS = [
  { value: 'never', label: 'NEVER' },
  { value: 'rarely', label: 'RARELY' },
  { value: '1-2_times_week', label: '1_2_TIMES_WEEK' },
  { value: '3-4_times_week', label: '3_4_TIMES_WEEK' },
  { value: '5-6_times_week', label: '5_6_TIMES_WEEK' },
  { value: 'daily', label: 'DAILY' }
]

// Sleep quality options
export const SLEEP_QUALITY_OPTIONS = [
  { value: 'excellent', label: 'EXCELLENT' },
  { value: 'good', label: 'GOOD' },
  { value: 'fair', label: 'FAIR' },
  { value: 'poor', label: 'POOR' },
  { value: 'very_poor', label: 'VERY_POOR' }
]

// Stress level options
export const STRESS_LEVEL_OPTIONS = [
  { value: 'very_low', label: 'VERY_LOW' },
  { value: 'low', label: 'LOW' },
  { value: 'moderate', label: 'MODERATE' },
  { value: 'high', label: 'HIGH' },
  { value: 'very_high', label: 'VERY_HIGH' }
]

// Diet type options
export const DIET_TYPE_OPTIONS = [
  { value: 'omnivore', label: 'OMNIVORE' },
  { value: 'vegetarian', label: 'VEGETARIAN' },
  { value: 'vegan', label: 'VEGAN' },
  { value: 'pescatarian', label: 'PESCATARIAN' },
  { value: 'keto', label: 'KETO' },
  { value: 'mediterranean', label: 'MEDITERRANEAN' },
  { value: 'low_carb', label: 'LOW_CARB' },
  { value: 'gluten_free', label: 'GLUTEN_FREE' },
  { value: 'other', label: 'OTHER' }
]

// Common allergies list
export const COMMON_ALLERGIES = [
  'Peanuts',
  'Tree nuts',
  'Milk',
  'Eggs',
  'Fish',
  'Shellfish',
  'Soy',
  'Wheat',
  'Sesame',
  'Penicillin',
  'Aspirin',
  'Ibuprofen',
  'Latex',
  'Pollen',
  'Dust mites',
  'Pet dander',
  'Mold',
  'Insect stings',
  'Contrast dye',
  'Other'
]

// Allergy reaction types
export const ALLERGY_REACTIONS = [
  'Hives',
  'Rash',
  'Swelling',
  'Difficulty breathing',
  'Wheezing',
  'Nausea',
  'Vomiting',
  'Diarrhea',
  'Anaphylaxis',
  'Itching',
  'Runny nose',
  'Watery eyes',
  'Other'
]

// Medication frequency options
export const MEDICATION_FREQUENCY = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'Four times daily',
  'Every other day',
  'Weekly',
  'As needed',
  'Other'
]

// Communication preferences
export const COMMUNICATION_PREFERENCES = [
  { value: 'email', label: 'EMAIL' },
  { value: 'sms', label: 'SMS' },
  { value: 'phone', label: 'PHONE_CALL' },
  { value: 'app_notification', label: 'APP_NOTIFICATION' },
  { value: 'postal_mail', label: 'POSTAL_MAIL' }
]

// Appointment preferences
export const APPOINTMENT_PREFERENCES = [
  { value: 'telemedicine', label: 'TELEMEDICINE' },
  { value: 'in_person', label: 'IN_PERSON' },
  { value: 'home_visit', label: 'HOME_VISIT' },
  { value: 'urgent_care', label: 'URGENT_CARE' }
]

// Insurance providers (Thailand)
export const INSURANCE_PROVIDERS = [
  'Social Security (สปส.)',
  'Government Welfare Scheme',
  'BUPA Thailand',
  'AIA Thailand',
  'Allianz Ayudhya',
  'Bangkok Insurance',
  'Muang Thai Insurance',
  'Pacific Cross',
  'Cigna Thailand',
  'AXA Insurance',
  'Tune Protect',
  'LMG Insurance',
  'Other'
]

// Device types
export const DEVICE_TYPES = [
  { value: 'smartphone', label: 'SMARTPHONE' },
  { value: 'tablet', label: 'TABLET' },
  { value: 'computer', label: 'COMPUTER' },
  { value: 'smartwatch', label: 'SMARTWATCH' },
  { value: 'blood_pressure_monitor', label: 'BLOOD_PRESSURE_MONITOR' },
  { value: 'glucose_meter', label: 'GLUCOSE_METER' },
  { value: 'fitness_tracker', label: 'FITNESS_TRACKER' },
  { value: 'pulse_oximeter', label: 'PULSE_OXIMETER' },
  { value: 'thermometer', label: 'DIGITAL_THERMOMETER' },
  { value: 'scale', label: 'DIGITAL_SCALE' }
]

// Validation rules
export const VALIDATION_RULES = {
  required: [
    { required: true, message: 'This field is required' }
  ],
  email: [
    { type: 'email', message: 'Please enter a valid email' },
    { required: true, message: 'Email is required' }
  ],
  phone: [
    { pattern: /^[0-9]{10}$/, message: 'Please enter a valid 10-digit phone number' },
    { required: true, message: 'Phone number is required' }
  ],
  height: [
    { type: 'number', min: 50, max: 300, message: 'Height must be between 50-300 cm' }
  ],
  weight: [
    { type: 'number', min: 10, max: 500, message: 'Weight must be between 10-500 kg' }
  ]
}

// Helper function to get initial form data
export const getInitialFormData = () => ({
  // Basic Information
  fname: '',
  lname: '',
  dob: null,
  sex_at_birth: '',
  language_preference: 'th',
  email: '',
  phone_number: '',
  
  // Address Information
  address: '',
  city: '',
  province: '',
  postal_code: '',
  country: 'Thailand',
  
  // Emergency Contact
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relationship: '',

  // Physical Information
  height_cm: null,
  weight_kg: null,
  bmi: null,
  blood_type: '',

  // Medical History
  conditions: [],
  allergies: [],
  medications: [],
  surgical_history: [],
  immunizations: [],
  is_pregnant: false,
  gestational_weeks: null,
  lmp_date: null,

  // Lifestyle
  // smoking_status: '',
  // cigarettes_per_day: null,
  // smoking_years: null,
  // quit_smoking_date: '',
  // alcohol_consumption: '',
  // drinks_per_week: null,
  // exercise_frequency: '',
  // exercise_types: [],
  // exercise_duration: null,
  // diet_type: '',
  // dietary_restrictions: '',
  // sleep_hours_info: {
  //   average: null,
  //   bedtime: '',
  //   wake_time: ''
  // },
  // sleep_quality: '',
  // sleep_issues: [],
  // stress_level: '',
  // stress_factors: [],
  // coping_mechanisms: '',
  // mental_health_history: '',

  // // Preferences
  // preferred_communication_method: [],
  // appointment_reminders: [],
  // reminder_timing: '',
  // best_contact_time: '',
  // preferred_appointment_types: [],
  // preferred_pharmacy: '',
  // doctor_gender_preference: 'no_preference',
  // // accessibility_needs: '',
  // insurance_info: {
  //   has_insurance: false,
  //   provider: '',
  //   policy_number: '',
  //   group_number: '',
  //   notes: ''
  // },
  // devices_used: [],
  // tech_comfort_level: '',
  // internet_quality: '',
  // consent_info: {
  //   share_data_for_research: false,
  //   marketing_communications: false,
  //   emergency_data_access: true,
  //   family_access_consent: false,
  //   authorized_family_members: ''
  // },
  // additional_notes: ''
})

// Validation function for each step
export const validateStep = (stepKey, formData) => {
  switch (stepKey) {
    case 'basic':
      return !!(
        formData.fname &&
        formData.lname &&
        formData.dob &&
        formData.sex_at_birth &&
        formData.email &&
        formData.phone_number
      )
    
    case 'physical':
      return !!(
        formData.height_cm &&
        formData.weight_kg
      )
    
    case 'medical':
      // Medical history is mostly optional, just check if at least something is filled
      return true
    
    case 'lifestyle':
      // Lifestyle information is mostly optional
      return true
    
    case 'preferences':
      // Preferences are mostly optional, but require communication method
      return !!(formData.preferred_communication_method?.length > 0)
    
    default:
      return true
  }
}

// BMI calculation helper
export const calculateBMI = (height, weight) => {
  if (!height || !weight) return null
  const heightInMeters = height / 100
  return Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10
}

// BMI category helper
export const getBMICategory = (bmi) => {
  if (!bmi) return null
  if (bmi < 18.5) return 'underweight'
  if (bmi < 25) return 'normal'
  if (bmi < 30) return 'overweight'
  return 'obese'
}

// BMI color helper
export const getBMIColor = (bmi) => {
  const category = getBMICategory(bmi)
  switch (category) {
    case 'underweight':
      return '#1890ff'
    case 'normal':
      return '#52c41a'
    case 'overweight':
      return '#faad14'
    case 'obese':
      return '#f5222d'
    default:
      return '#d9d9d9'
  }
}