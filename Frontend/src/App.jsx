import { Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Footer from "./Components/Footer/Footer";
import Discover from "./Pages/Discover/Discover";
import Login from "./Pages/Login/Login";
import Header from "./Components/Navbar/Navbar";
import LandingPage from "./Pages/LandingPage/LandingPage";
import AboutUs from "./Pages/AboutUs/AboutUs";
import Chats from "./Pages/Chats/Chats";
import Report from "./Pages/Report/Report";
import Profile from "./Pages/Profile/Profile";
import NotFound from "./Pages/NotFound/NotFound";
import Register from "./Pages/Register/Register";
import SignUp from "./Pages/SignUp/SignUp";
import Meetings from "./Pages/Meetings/Meetings";
import VideoRoom from "./Pages/VideoRoom/VideoRoom";
import Rating from "./Pages/Rating/Rating";
import EditProfile from "./Pages/EditProfile/EditProfile";
import PrivateRoutes from "./util/PrivateRoutes";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const element = document.getElementById(hash.replace("#", ""));
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
};

const App = () => {
  const location = useLocation();
  // Hide navbar and footer when in a video room
  const isVideoRoom = location.pathname.startsWith("/room/");

  return (
    <>
      <ScrollToTop />
      {!isVideoRoom && <Header />}
      <ToastContainer position="top-right" />
      <Routes>
        <Route element={<PrivateRoutes />}>
          <Route path="/chats" element={<Chats />} />
          <Route path="/meetings" element={<Meetings />} />
          <Route path="/room/:roomId" element={<VideoRoom />} />
        </Route>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/register" element={<Register />} />
        <Route path="/about_us" element={<AboutUs />} />
        <Route path="/edit_profile" element={<EditProfile />} />
        <Route path="/report/:username" element={<Report />} />
        <Route path="/profile/:username" element={<Profile />} />
        <Route path="/rating/:username" element={<Rating />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      {!isVideoRoom && <Footer />}
    </>
  );
};

export default App;
