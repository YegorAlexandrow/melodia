// Типы, зеркалящие схемы бэкенда (app/schemas.py).

export type CopyStatus =
  | "owned"
  | "wanted"
  | "ordered"
  | "sold"
  | "gifted"
  | "lent_out";

export type SoundMode = "mono" | "stereo" | "quad";

export interface MediaRead {
  key: string;
  loc: string;
  mime_type: string;
  role?: string | null;
  width?: number | null;
  height?: number | null;
  url: string;
}

export interface Track {
  position: string;
  side?: string | null;
  seq?: number | null;
  title: string;
  artist?: string | null;
  duration_text?: string | null;
  duration_sec?: number | null;
}

export interface Identifier {
  type: string;
  value: string;
  description?: string | null;
}

export interface DiscogsCandidate {
  discogs_release_id: number;
  title: string;
  artist?: string | null;
  catalog_number?: string | null;
  catalog_number_norm?: string | null;
  year?: number | null;
  country?: string | null;
  formats: string[];
  label?: string | null;
  thumb?: string | null;
  cover_image?: string | null;
}

export interface SearchResponse {
  query_norm?: string | null;
  rate_limit?: number | null;
  rate_limit_remaining?: number | null;
  results: DiscogsCandidate[];
}

export interface ReleaseRead {
  discogs_release_id: number;
  discogs_master_id?: number | null;
  title: string;
  primary_artist?: string | null;
  artists: string[];
  label?: string | null;
  catalog_number?: string | null;
  catalog_number_norm?: string | null;
  prefix?: string | null;
  country?: string | null;
  released_year?: number | null;
  formats: string[];
  sound_mode?: SoundMode | null;
  genres: string[];
  styles: string[];
  tracklist: Track[];
  identifiers: Identifier[];
  images: MediaRead[];
  discogs_uri?: string | null;
}

export interface Grade {
  media?: string | null;
  sleeve?: string | null;
  graded_at?: number;
  note?: string | null;
}

export interface Pressing {
  plant_code?: string | null;
  matrix_runout?: string | null;
  sound_mode?: SoundMode | null;
  speed_rpm?: number;
  gost?: string | null;
  pressing_year?: number | null;
  note?: string | null;
}

export interface Acquisition {
  acquired_on?: string | null;
  source?: string | null;
  place?: string | null;
  price?: number | null;
  currency?: string;
  note?: string | null;
}

export interface RatingEntry {
  album?: number | null;
  sound?: number | null;
  rated_at?: number;
  note?: string | null;
}

export interface CopyListItem {
  id: string;
  status: CopyStatus;
  display_title?: string | null;
  display_artist?: string | null;
  catalog_number?: string | null;
  year?: number | null;
  cover?: MediaRead | null;
  current_album_rating?: number | null;
  current_sound_rating?: number | null;
  is_favorite: boolean;
  has_audio: boolean;
  has_notes: boolean;
  plant_code?: string | null;
  genres: string[];
  tags: string[];
}

export interface CopyRead {
  id: string;
  status: CopyStatus;
  display_title?: string | null;
  display_artist?: string | null;
  catalog_number?: string | null;
  year?: number | null;
  cover?: MediaRead | null;
  is_favorite: boolean;
  current_album_rating?: number | null;
  current_sound_rating?: number | null;
  rating_history: RatingEntry[];
  grade?: Grade | null;
  pressing?: Pressing | null;
  acquisition?: Acquisition | null;
  storage_location?: string | null;
  tags: string[];
  play_count: number;
  last_played_at?: number | null;
  copy_index: number;
  copy_total: number;
  release?: ReleaseRead | null;
}
