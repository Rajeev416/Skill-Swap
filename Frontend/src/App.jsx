import React, { Suspense, lazy, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Footer from "./Components/Footer/Footer";
import Header from "./Components/Navbar/Navbar";
import PrivateRoutes from "./util/PrivateRoutes";
import ErrorBoundary from "./Components/ErrorBoundary/ErrorBoundary";
import { ToastContainer } from "react-toastify";
import { Spinner } from "react-bootstrap";
import "react-toastify/dist/ReactToastify.css";

// Lazy Loaded Routes
const LandingPage = lazy(() => import("./Pages/LandingPage/LandingPage"));
const Discover = lazy(() => import("./Pages/Discover/Discover"));
const Login = lazy(() => import("./Pages/Login/Login"));
const SignUp = lazy(() => import("./Pages/SignUp/SignUp"));
const AboutUs = lazy(() => import("./Pages/AboutUs/AboutUs"));
const Chats = lazy(() => import("./Pages/Chats/Chats"));
const Report = lazy(() => import("./Pages/Report/Report"));
const Profile = lazy(() => import("./Pages/Profile/Profile"));
const Register = lazy(() => import("./Pages/Register/Register"));
const Meetings = lazy(() => import("./Pages/Meetings/Meetings"));
const VideoRoom = lazy(() => import("./Pages/VideoRoom/VideoRoom"));
const Rating = lazy(() => import("./Pages/Rating/Rating"));
const EditProfile = lazy(() => import("./Pages/EditProfile/EditProfile"));
const NotFound = lazy(() => import("./Pages/NotFound/NotFound"));

// Fallback Loader
const FallbackLoader = () => (
  <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
    <Spinner animation="border" style={{ color: "#3BB4A1" }} />
  </div>
);

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
      <ErrorBoundary>
        <Suspense fallback={<FallbackLoader />}>
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
        </Suspense>
      </ErrorBoundary>

      {!isVideoRoom && <Footer />}
    </>
  );
};

export default App;
