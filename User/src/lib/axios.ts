import axios from "axios"


const api = axios.create({
  baseURL:
    window.location.hostname === "localhost"
      ? "http://localhost:3000"          
      : "https://ims-server-sage.vercel.app", 
  withCredentials: true,

})

api.interceptors.response.use(
  (response) => response,

  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.error;

    if (status === 401 && (message === "jwt expired" || message === "Invalid token" || message === "No token")) {
      // Remove token
      localStorage.removeItem("token");

      // Redirect to login
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);


export default api