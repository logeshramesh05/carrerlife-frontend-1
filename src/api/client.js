import axios from "axios";

const client = axios.create({
  baseURL: "https://carrerlife-prod.onrender.com/api/v1",
});

console.log("BASE_URL", import.meta.env.BASE_URL);

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = null;

async function doRefresh() {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) throw new Error("no refresh token");
  const res = await axios.post(
    `https://carrerlife-prod.onrender.com/api/v1/auth/refresh`,
    { refreshToken }
  );
  localStorage.setItem("accessToken", res.data.accessToken);
  localStorage.setItem("refreshToken", res.data.refreshToken);
  return res.data.accessToken;
}

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        if (!refreshing) refreshing = doRefresh().finally(() => (refreshing = null));
        const token = await refreshing;
        original.headers.Authorization = `Bearer ${token}`;
        return client(original);
      } catch {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userName");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default client;
