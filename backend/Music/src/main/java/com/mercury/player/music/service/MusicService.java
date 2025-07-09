package com.mercury.player.music.service;

import com.mercury.player.music.entity.Music;
import com.mercury.player.music.mapper.MusicMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MusicService {

    private final MusicMapper musicMapper;

    public MusicService(MusicMapper musicMapper) {
        this.musicMapper = musicMapper;
    }

    public List<Music> findAll() {
        return musicMapper.findAll();
    }

    public Music findById(Integer id) {
        return musicMapper.findById(id);
    }

    public Music save(Music music) {
        musicMapper.insert(music);
        return music;
    }

    public Music update(Music music) {
        musicMapper.update(music);
        return music;
    }

    public void delete(Integer id) {
        musicMapper.delete(id);
    }
}