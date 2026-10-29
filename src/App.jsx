import { Route, Routes } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import MainLayout from "./widgets/layouts/main-layout";

import Home from "./pages/home";
import Discover from "./pages/discover";
import Library from "./pages/library";
import NotFound from "./pages/not-found";
import Login from "./pages/login";
import Profile from "./pages/profile";
import Games from "./pages/games";
import GameDetails from "./pages/game-details";
import SearchResults from "./pages/search-results";
import GameCards from "./pages/GameCards";
import Wallet from "./pages/Wallet";
import GameRequest from "./pages/game-request";
import Notifications from "./pages/Notifications";
import Orders from "./pages/Orders";
import Support from "./pages/Support";

import PageTitle from "./components/PageTitle";

function App() {
  return (
    <AuthProvider>
      <PageTitle />

      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/library" element={<Library />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/request-game" element={<GameRequest />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/support" element={<Support />} />

          <Route path="/games" element={<Games />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/game/:slug" element={<GameDetails />} />

          {/* Shopping */}
          <Route
            path="/shopping/game-cards"
            element={<GameCards />}
          />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;