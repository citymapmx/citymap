import { getSmartScheduleInfo } from './src/lib/utils.js';

const b = {
  schedule: {
    vie: "10:30 PM - 03:00 AM",
    sab: "10:30 PM - 03:00 AM"
  }
};

const now = new Date("2023-10-15T02:30:00"); // 2:30 AM Sunday
console.log(getSmartScheduleInfo(b, "America/Mexico_City", now));
