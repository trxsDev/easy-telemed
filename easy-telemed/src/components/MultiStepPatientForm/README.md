# Multi-Step Patient Profile Form

## Overview
นี่คือ Multi-Step Patient Profile Form ที่แบ่งการกรอกข้อมูลออกเป็น 9 ขั้นตอน เพื่อให้ผู้ใช้สามารถกรอกข้อมูลได้อย่างเป็นระเบียบและไม่รู้สึกท่วมท้น โดยออกแบบให้สอดคล้องกับ Database Schema อย่างสมบูรณ์

## Database Schema Compliance
Form นี้ออกแบบให้ตรงกับ `patient_profiles` table schema:

### Required Fields
- `user_id` (handled by parent component)
- `consent_telemed` (required, default: false)
- `consent_privacy` (required, default: true)

### Optional Fields
- Basic Info: `fname`, `lname`, `dob`, `sex_at_birth`, `language_pref`, `phone`
- JSONB Fields: `address`, `emergency_contact`, `allergies`, `conditions`, `medications`, `surgical_history`, `immunizations`, `preferred_pharmacy`, `insurance`, `devices`
- Physical: `height_cm`, `weight_kg` (BMI auto-generated)
- Pregnancy: `is_pregnant`, `gestational_weeks`, `lmp_date`
- Lifestyle: `smoking_status`, `alcohol_use`
- Preferences: `preferred_contact_method`, `avatar_path`

## Structure

### Main Component
- **`MultiStepPatientForm/index.jsx`** - Main form component ที่จัดการ navigation และ data processing

### Step Components
แต่ละ step จัดเก็บข้อมูลตามหมวดหมู่ต่างๆ ตาม database schema:

1. **`BasicInformationStep.jsx`** - ข้อมูลพื้นฐาน
   - ชื่อ, นามสกุล (`fname`, `lname`)
   - วันเกิด (`dob`)
   - เพศ (`sex_at_birth`)
   - ภาษาที่ต้องการ (`language_pref`)
   - หมายเลขโทรศัพท์ (`phone`)

2. **`AddressInformationStep.jsx`** - ที่อยู่
   - ที่อยู่สมบูรณ์ (`address` JSONB)
   - รวมถนน, เมือง, จังหวัด, รหัสไปรษณีย์

3. **`EmergencyContactStep.jsx`** - ผู้ติดต่อกรณีฉุกเฉิน
   - ข้อมูลผู้ติดต่อ (`emergency_contact` JSONB)
   - ชื่อ, เบอร์โทร, ความสัมพันธ์

4. **`PhysicalInformationStep.jsx`** - ข้อมูลทางกาย
   - ส่วนสูง (`height_cm`)
   - น้ำหนัก (`weight_kg`)
   - BMI (คำนวณอัตโนมัติโดย database)

5. **`MedicalInformationStep.jsx`** - ประวัติทางการแพทย์
   - ยาที่แพ้ (`allergies` JSONB array)
   - โรคประจำตัว (`conditions` JSONB array)
   - ยาที่กิน (`medications` JSONB array)
   - ประวัติการผ่าตัด (`surgical_history` JSONB array)
   - การฉีดวัคซีน (`immunizations` JSONB array)

6. **`PregnancyInformationStep.jsx`** - ข้อมูลการตั้งครรภ์
   - สถานะการตั้งครรภ์ (`is_pregnant`)
   - อายุครรภ์ (`gestational_weeks`)
   - วันมีประจำเดือนครั้งสุดท้าย (`lmp_date`)

7. **`LifestyleInformationStep.jsx`** - ข้อมูลไลฟ์สไตล์
   - สถานะการสูบบุหรี่ (`smoking_status`)
   - การดื่มแอลกอฮอล์ (`alcohol_use`)

8. **`PreferencesStep.jsx`** - การตั้งค่าและความต้องการ
   - วิธีการติดต่อที่ต้องการ (`preferred_contact_method`)
   - ร้านยาที่ใช้ (`preferred_pharmacy` JSONB)
   - ข้อมูลประกันสุขภาพ (`insurance` JSONB array)
   - อุปกรณ์สุขภาพ (`devices` JSONB array)
   - รูปโปรไฟล์ (`avatar_path`)

9. **`ConsentStep.jsx`** - การยินยอมและความเป็นส่วนตัว
   - ยินยอมใช้บริการ telemedicine (`consent_telemed`)
   - ยินยอมนโยบายความเป็นส่วนตัว (`consent_privacy`)

## Data Processing

### Schema Mapping
Form จะประมวลผลข้อมูลให้ตรงกับ database schema:

```sql
CREATE TABLE patient_profiles (
  user_id uuid PRIMARY KEY,
  fname text,
  lname text,
  dob date,
  sex_at_birth text CHECK (sex_at_birth IN ('male', 'female', 'intersex', 'unknown')),
  language_pref text DEFAULT 'th',
  phone text,
  address jsonb DEFAULT '{}',
  emergency_contact jsonb DEFAULT '{}',
  height_cm numeric(5, 2),
  weight_kg numeric(5, 2),
  bmi numeric GENERATED ALWAYS AS (...) STORED,
  allergies jsonb DEFAULT '[]',
  conditions jsonb DEFAULT '[]',
  medications jsonb DEFAULT '[]',
  surgical_history jsonb DEFAULT '[]',
  immunizations jsonb DEFAULT '[]',
  is_pregnant boolean,
  gestational_weeks integer,
  lmp_date date,
  smoking_status text,
  alcohol_use text,
  preferred_pharmacy jsonb,
  preferred_contact_method text,
  insurance jsonb DEFAULT '[]',
  devices jsonb DEFAULT '[]',
  avatar_path text,
  consent_telemed boolean NOT NULL DEFAULT false,
  consent_privacy boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Processed Data Structure
```javascript
{
  // Basic Information
  fname: string | null,
  lname: string | null,
  dob: 'YYYY-MM-DD' | null,
  sex_at_birth: 'male'|'female'|'intersex'|'unknown' | null,
  language_pref: 'th'|'en' (default: 'th'),
  phone: string | null,

  // JSONB Fields
  address: { street, city, province, postal_code },
  emergency_contact: { name, phone, relationship },
  allergies: string[],
  conditions: string[],
  medications: string[],
  surgical_history: string[],
  immunizations: string[],
  preferred_pharmacy: object,
  insurance: string[],
  devices: string[],

  // Physical (numeric with precision)
  height_cm: number | null,
  weight_kg: number | null,

  // Pregnancy
  is_pregnant: boolean,
  gestational_weeks: integer | null,
  lmp_date: 'YYYY-MM-DD' | null,

  // Lifestyle
  smoking_status: string | null,
  alcohol_use: string | null,

  // Preferences
  preferred_contact_method: string | null,
  avatar_path: string | null,

  // Required Consents
  consent_telemed: boolean (required),
  consent_privacy: boolean (required, default: true)
}
```

### Text Processing
Form สามารถจัดการ input แบบต่างๆ:

1. **Array Fields**: รับ text input แล้วแปลงเป็น array
   - แยกด้วย comma หรือ newline
   - ลบ whitespace อัตโนมัติ
   - กรอง empty values

2. **JSON Fields**: รับ text input แล้วแปลงเป็น JSON object
   - ลอง parse เป็น JSON ก่อน
   - ถ้าไม่ได้ จะสร้าง simple object

3. **Date Fields**: ใช้ dayjs format conversion

## Features

### Navigation
- **Previous/Next buttons** สำหรับเปลี่ยน step
- **Progress bar** แสดงความคืบหน้า
- **Step indicator** แสดง step ปัจจุบัน
- **Validation** ต่อ step ก่อนไป step ถัดไป

### Validation
- **Field validation** ต่อ step
- **Required fields** ตามที่กำหนด
- **Format validation** (phone, email, etc.)
- **Cross-field validation** (เช่น BMI calculation)

### User Experience
- **Auto-save** ข้อมูลระหว่าง step
- **BMI calculation** แบบ real-time
- **Conditional fields** (เช่น pregnancy info สำหรับ female only)
- **Helpful tooltips** และ descriptions

## Usage

```jsx
import MultiStepPatientForm from '../../components/MultiStepPatientForm'

function ProfilePage() {
  const handleSubmit = async (formData) => {
    // Process the complete form data
    console.log('Form submitted:', formData)
    // Save to database
  }

  return (
    <MultiStepPatientForm 
      onSubmit={handleSubmit}
      mode="create" // or "edit"
      initialData={existingData} // optional
      loading={false} // optional
    />
  )
}
```

## Benefits

1. **Better UX**: แบ่งข้อมูลเป็นส่วนๆ ไม่ให้รู้สึกท่วมท้น
2. **Better Validation**: ตรวจสอบข้อมูลต่อส่วน
3. **Better Organization**: จัดกลุ่มข้อมูลตามหมวดหมู่
4. **Flexible Input**: รองรับทั้ง JSON และ text input
5. **Progressive Disclosure**: แสดงเฉพาะข้อมูลที่เกี่ยวข้อง
6. **Data Integrity**: ประมวลผลและตรวจสอบข้อมูลก่อน submit

## Customization

ถ้าต้องการเพิ่มหรือแก้ไข step:

1. สร้าง step component ใหม่ใน `steps/` folder
2. เพิ่มใน `steps` array ของ main component
3. กำหนด `fields` ที่เกี่ยวข้องสำหรับ validation
4. อัปเดต `processFormData` ถ้าจำเป็น

## Notes

- Form จะ auto-save ข้อมูลระหว่าง step
- สามารถกลับไปแก้ไขข้อมูล step ก่อนหน้าได้
- ข้อมูลจะถูก process และ validate ก่อน submit
- รองรับทั้ง create และ edit mode