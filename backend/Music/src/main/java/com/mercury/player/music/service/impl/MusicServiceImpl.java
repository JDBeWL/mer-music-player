package com.mercury.player.music.service.impl;

import com.mercury.player.music.entity.Music;
import com.mercury.player.music.mapper.MusicMapper;
import com.mercury.player.music.service.MusicService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class MusicServiceImpl extends MusicService {

    @Autowired
    private MusicMapper musicMapper;

    public MusicServiceImpl(MusicMapper musicMapper) {
        super(musicMapper);
    }

    @Override
    public List<Music> findAll() {
        return musicMapper.findAll();
    }

    @Override
    public Music findById(Integer id) {
        return musicMapper.findById(id);
    }

    @Override
    @Transactional
    public Music save(Music music) {
        musicMapper.insert(music);
        return music;
    }

    @Override
    @Transactional
    public Music update(Music music) {
        musicMapper.update(music);
        return music;
    }

    @Override
    @Transactional
    public void delete(Integer id) {
        musicMapper.delete(id);
    }
}    