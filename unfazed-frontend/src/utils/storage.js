const THERAPIST_KEY = 'unfazed.therapist.token';
const CLIENT_KEY = 'unfazed.client.token';

function read(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function write(key, value) {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch (error) {
    return;
  }
}

export const therapistToken = {
  get: () => read(THERAPIST_KEY),
  set: (value) => write(THERAPIST_KEY, value),
  clear: () => write(THERAPIST_KEY, null),
};

export const clientToken = {
  get: () => read(CLIENT_KEY),
  set: (value) => write(CLIENT_KEY, value),
  clear: () => write(CLIENT_KEY, null),
};
