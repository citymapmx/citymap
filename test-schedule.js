import { getSmartScheduleInfo } from './src/lib/utils.js';

const b = {
  schedule: {
    vie: "10:30 PM - 03:00 AM",
    sab: "10:30 PM - 03:00 AM"
  },
  open: false
};

// Sunday at 12:30 AM
const now = new Date("2023-10-15T00:30:00"); 

console.log(getSmartScheduleInfo(b, "America/Mexico_City", now));
