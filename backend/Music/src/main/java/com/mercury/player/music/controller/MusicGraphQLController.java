package com.mercury.player.music.controller;

import com.mercury.player.music.entity.Music;
import com.mercury.player.music.service.MusicService;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

@Controller
public class MusicGraphQLController {

    private final MusicService musicService;

    public MusicGraphQLController(MusicService musicService) {
        this.musicService = musicService;
    }

    @QueryMapping
    public Iterable<Music> allMusics() {
        return musicService.findAll();
    }

    @QueryMapping
    public Music music(@Argument Integer id) {
        return musicService.findById(id);
    }

    @MutationMapping
    public Music createMusic(@Argument String title,
                             @Argument String cover,
                             @Argument String artist,
                             @Argument String url) {
        Music music = new Music();
        music.setTitle(title);
        music.setCover(cover);
        music.setArtist(artist);
        music.setUrl(url);
        return musicService.save(music);
    }

    @MutationMapping
    public Music updateMusic(@Argument Integer id,
                             @Argument String title,
                             @Argument String cover,
                             @Argument String artist,
                             @Argument String url) {
        Music music = musicService.findById(id);
        if (title != null) music.setTitle(title);
        if (cover != null) music.setCover(cover);
        if (artist != null) music.setArtist(artist);
        if (url != null) music.setUrl(url);
        musicService.update(music);
        return music;
    }

    @MutationMapping
    public Boolean deleteMusic(@Argument Integer id) {
        musicService.delete(id);
        return true;
    }
}