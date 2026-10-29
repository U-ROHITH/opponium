import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { RequireRole } from "./components/Guard";
import { CandidateLayout, RecruiterLayout, WakeNotice } from "./components/layouts";
import { AuthProvider } from "./lib/auth";
import Landing from "./pages/Landing";
import { AcceptInvite, AdminNotice, EnterInvite, Login, Onboarding, RequestAccess, VerifyEmail, VerifyPhone } from "./pages/Auth";
import { Applications, Apply, JobDetail, Jobs, Submitted, Tracker } from "./pages/Candidate";
import { Inbox, JobPipeline, NewJob, RecruiterJobs, ReviewApplicant, Team } from "./pages/Recruiter";
import { Settings } from "./pages/Settings";

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollTop />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/screens" element={<Navigate to="/" replace />} />
          <Route path="/invite" element={<EnterInvite />} />
          <Route path="/invite/:token" element={<AcceptInvite />} />
          <Route path="/verify/email" element={<VerifyEmail />} />
          <Route path="/verify/phone" element={<VerifyPhone />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/login" element={<Login />} />
          <Route path="/request-access" element={<RequestAccess />} />
          <Route path="/admin" element={<AdminNotice />} />
          <Route
            element={
              <RequireRole roles={["candidate"]}>
                <CandidateLayout />
              </RequireRole>
            }
          >
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/jobs/:id/apply" element={<Apply />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/applications/:id" element={<Tracker />} />
            <Route path="/applications/:id/submitted" element={<Submitted />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route
            element={
              <RequireRole roles={["recruiter", "hiring_manager"]}>
                <RecruiterLayout />
              </RequireRole>
            }
          >
            <Route path="/r" element={<Navigate to="/r/inbox" replace />} />
            <Route path="/r/inbox" element={<Inbox />} />
            <Route path="/r/jobs" element={<RecruiterJobs />} />
            <Route path="/r/jobs/new" element={<NewJob />} />
            <Route path="/r/jobs/:id" element={<JobPipeline />} />
            <Route path="/r/applications/:id" element={<ReviewApplicant />} />
            <Route path="/r/team" element={<Team />} />
            <Route path="/r/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <WakeNotice />
      </BrowserRouter>
    </AuthProvider>
  );
}
