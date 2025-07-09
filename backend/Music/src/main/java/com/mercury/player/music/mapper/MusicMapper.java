package com.mercury.player.music.mapper;

import com.mercury.player.music.entity.Music;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface MusicMapper {
    @Select("SELECT * FROM music_tb")
    List<Music> findAll();

    @Select("SELECT * FROM music_tb WHERE id = #{id}")
    Music findById(@Param("id") Integer id);

    @Insert("INSERT INTO music_tb(title, cover, artist, url) VALUES(#{title}, #{cover}, #{artist}, #{url})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(Music music);

    @Update("UPDATE music_tb SET title = #{title}, cover = #{cover}, artist = #{artist}, url = #{url} WHERE id = #{id}")
    int update(Music music);

    @Delete("DELETE FROM music_tb WHERE id = #{id}")
    int delete(@Param("id") Integer id);
}