import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Shell } from "./components/Shell";
import { AdminState } from "./state";
import { Audit, Companies, Invites, Login, Lookup, Overview, Requests, Settings, Sla, Users } from "./pages/Pages";

export default function App() {
  return (
    <AdminState>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Shell />}>
          <Route path="/" element={<Overview />} />
          <Route path="/invites" element={<Invites />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/users" element={<Users />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/sla" element={<Sla />} />
          <Route path="/applications" element={<Lookup />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Overview />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </AdminState>
  );
}
