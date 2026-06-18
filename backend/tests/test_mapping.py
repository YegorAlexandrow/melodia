from app.models.catalog import MediaLocation, SoundMode
from app.services.mapping import map_release, parse_duration

from .sample_release import SAMPLE_RELEASE


def test_parse_duration():
    assert parse_duration("3:58") == 238
    assert parse_duration("1:02:03") == 3723
    assert parse_duration("") is None
    assert parse_duration(None) is None
    assert parse_duration("abc") is None


def test_map_release_basic_fields():
    r = map_release(SAMPLE_RELEASE)
    assert r.discogs_release_id == 1234567
    assert r.discogs_master_id == 98765
    assert r.primary_artist == "Давид Тухманов"
    assert r.catalog_number == "С60—07271-2"
    assert r.catalog_number_norm == "С60072712"
    assert r.prefix == "С60"
    assert r.released_year == 1976
    assert r.sound_mode is SoundMode.STEREO
    assert "Rock" in r.genres


def test_map_release_tracklist_sides():
    r = map_release(SAMPLE_RELEASE)
    assert len(r.tracklist) == 3
    a1 = r.tracklist[0]
    assert a1.position == "A1"
    assert a1.side == "A"
    assert a1.seq == 1
    assert a1.duration_sec == 238
    assert r.tracklist[2].side == "B"


def test_map_release_identifiers_and_images():
    r = map_release(SAMPLE_RELEASE)
    matrix = [i for i in r.identifiers if i.type == "Matrix / Runout"]
    assert matrix and matrix[0].value.startswith("С60 07271")
    assert r.images[0].loc is MediaLocation.WEB
    assert r.images[0].key == "https://img.discogs.com/cover.jpg"
    assert r.images[0].role == "primary"


def test_map_release_keeps_raw():
    r = map_release(SAMPLE_RELEASE)
    assert r.raw["id"] == 1234567
    assert r.fetched_at is not None
