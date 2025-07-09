package com.mercury.player.music.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Music {
    private int id;
    private String title;
    private String cover;
    private String artist;
    private String url;
}    