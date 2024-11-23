
const { utcToZonedTime, format } = require('date-fns-tz');

const hawaiiTime = utcToZonedTime(new Date(), 'Pacific/Honolulu');
const formattedTime = format(hawaiiTime, 'yyyy-MM-dd HH:mm:ss zzz', { timeZone: 'Pacific/Honolulu' });

console.log(`Hawaii Time: ${formattedTime}`);
