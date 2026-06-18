import { Routes, Route, Navigate } from "react-router-dom";
import {
  CollectionScreen,
  AddScreen,
  CardScreen,
  NotesScreen,
  AudioScreen,
  StatsScreen,
} from "./screens";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<CollectionScreen />} />
      <Route path="/add" element={<AddScreen />} />
      <Route path="/copy/:id" element={<CardScreen />} />
      <Route path="/notes" element={<NotesScreen />} />
      <Route path="/audio" element={<AudioScreen />} />
      <Route path="/stats" element={<StatsScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
