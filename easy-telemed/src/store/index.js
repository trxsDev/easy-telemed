import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import availabilityReducer from "./availabilitySlice";
import casesReducer from "./casesSlice";
import profileReducer from "./profileSlice";
import doctorScheduleReducer from "./doctorScheduleSlice";
import consultationReducer from "./consultationSlice";
import doctorOnboardingReducer from "./doctorOnboardingSlice";
import matchingReducer from "./matchingSlice";
import adminUsersReducer from "./adminUsersSlice";
import doctorRequestsReducer from "./doctorRequestsSlice";
import telemedChatReducer from "./telemedChatSlice";
import telemedNotesReducer from "./telemedNotesSlice";
import twilioReducer from "./twilioSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    availability: availabilityReducer,
    cases: casesReducer,
    profile: profileReducer,
    doctorSchedule: doctorScheduleReducer,
    consultation: consultationReducer,
    doctorOnboarding: doctorOnboardingReducer,
    matching: matchingReducer,
    adminUsers: adminUsersReducer,
    doctorRequests: doctorRequestsReducer,
    telemedChat: telemedChatReducer,
    telemedNotes: telemedNotesReducer,
    twilio: twilioReducer,
  },
});

export const selectAuthState = (state) => state.auth;
export const selectAvailability = (state) => state.availability;
export const selectCases = (state) => state.cases;
export const selectProfile = (state) => state.profile;
export const selectDoctorScheduleState = (state) => state.doctorSchedule;
export const selectConsultation = (state) => state.consultation;
export const selectDoctorOnboardingState = (state) => state.doctorOnboarding;
export const selectMatchingState = (state) => state.matching;
export const selectAdminUsersState = (state) => state.adminUsers;
export const selectDoctorRequestsState = (state) => state.doctorRequests;
