import { getSmartScheduleInfo } from './src/lib/utils.js';

const b = {
  schedule: {
    vie: "10:30 PM - 03:00 AM",
    sab: "10:30 PM - 03:00 AM"
  }
};
// Use absolute time
const t1 = new Date("2023-10-15T00:30:00-06:00");
const t2 = new Date("2023-10-15T02:30:00-06:00");
console.log("00:30:", getSmartScheduleInfo(b, "America/Mexico_City", t1));
console.log("02:30:", getSmartScheduleInfo(b, "America/Mexico_City", t2));
