import { getSmartScheduleInfo } from './src/lib/utils.js';

const b = {
  schedule: {
    vie: "10:30 PM - 03:00 AM",
    sab: "10:30 PM - 03:00 AM"
  }
};
// Try 12:30 AM
console.log(getSmartScheduleInfo(b, "America/Mexico_City", new Date("2023-10-15T00:30:00")));
// Try 2:30 AM
console.log(getSmartScheduleInfo(b, "America/Mexico_City", new Date("2023-10-15T02:30:00")));
