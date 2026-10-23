const days = diffInDays;
let percent = 0;
if (days < 1) percent = days * 10;           // до 10% за первые сутки
else if (days < 3) percent = 10 + (days - 1) * 5;  // 10–20%
else if (days < 30) percent = 20 + ((days - 3) / 27) * 15; // 20–35%
else if (days < 365) percent = 35 + ((days - 30) / 335) * 35; // 35–70%
else percent = Math.min(70 + ((days - 365) / (365 * 9)) * 30, 100);
