import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { CandidateLayout, RecruiterLayout } from "./components/layouts";
import Landing from "./pages/Landing";
import Screens from "./pages/Screens";
import { AcceptInvite, EnterInvite, InviteExpired, Login, Onboarding, RequestAccess, VerifyEmail, VerifyPhone } from "./pages/Auth";
import { Applications, Apply, JobDetail, Jobs, Submitted, Tracker } from "./pages/Candidate";
import { Inbox, JobPipeline, NewJob, RecruiterJobs, ReviewApplicant, Team } from "./pages/Recruiter";

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/screens" element={<Screens />} />
        <Route path="/invite" element={<EnterInvite />} />
        <Route path="/invite/expired" element={<InviteExpired />} />
        <Route path="/invite/:token" element={<AcceptInvite />} />
        <Route path="/verify/email" element={<VerifyEmail />} />
        <Route path="/verify/phone" element={<VerifyPhone />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/request-access" element={<RequestAccess />} />
        <Route element={<CandidateLayout />}>
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/jobs/:id/apply" element={<Apply />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/applications/:id" element={<Tracker />} />
          <Route path="/applications/:id/submitted" element={<Submitted />} />
        </Route>
        <Route element={<RecruiterLayout />}>
          <Route path="/r/inbox" element={<Inbox />} />
          <Route path="/r/jobs" element={<RecruiterJobs />} />
          <Route path="/r/jobs/new" element={<NewJob />} />
          <Route path="/r/jobs/:id" element={<JobPipeline />} />
          <Route path="/r/applications/:id" element={<ReviewApplicant />} />
          <Route path="/r/team" element={<Team />} />
        </Route>
        <Route path="*" element={<Screens />} />
      </Routes>
    </BrowserRouter>
  );
}
