import { configureStore } from "@reduxjs/toolkit";
import availabilityReducer from "./availabilitySlice";
import casesReducer from "./casesSlice";

export const store = configureStore({
  reducer: {
    availability: availabilityReducer,
    cases: casesReducer,
  },
});

export const selectAvailability = (state) => state.availability;
export const selectCases = (state) => state.cases;
