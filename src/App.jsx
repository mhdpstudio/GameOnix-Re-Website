import { Route, Routes } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import MainLayout from "./widgets/layouts/main-layout";

import Home from "./pages/Home";
import Discover from "./pages/discover";
import Library from "./pages/library";
import NotFound from "./pages/not-found";
import Login from "./pages/login";
import Profile from "./pages/profile";
import Games from "./pages/games";
import GameDetails from "./pages/game-details";
import SearchResults from "./pages/search-results";
import GameCards from "./pages/GameCards";

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