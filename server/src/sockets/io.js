let io = null;
export const setIo = (instance) => {
  io = instance;
};
/** Broadcast to everybody in the fleet room. No-op when sockets are not running (e.g. seed script). */
export const emit = (event, payload) => {
  if (io) io.to('fleet').emit(event, payload);
};
