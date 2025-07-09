

import api from './index';

// GraphQL端点
const GRAPHQL_ENDPOINT = '/api/graphql';

/**
 * 执行GraphQL查询
 * @param {string} query - GraphQL查询字符串
 * @param {Object} variables - 查询变量
 * @returns {Promise} - 返回查询结果
 */
export const executeGraphQL = async (query, variables = {}) => {
  try {
    const response = await api.post(GRAPHQL_ENDPOINT, {
      query,
      variables
    });
    
    if (response.errors) {
      throw new Error(response.errors.map(e => e.message).join(', '));
    }
    
    return response.data;
  } catch (error) {
    console.error('GraphQL请求失败:', error);
    throw error;
  }
};

// 获取所有音乐
export const getAllMusic = async () => {
  const query = `
    query {
      allMusics {
        id
        title
        artist
        cover
        url
      }
    }
  `;
  
  const result = await executeGraphQL(query);
  return result.allMusics;
};

// 获取单个音乐
export const getMusicById = async (id) => {
  const query = `
    query ($id: Int!) {
      music(id: $id) {
        id
        title
        artist
        cover
        url
      }
    }
  `;
  
  const result = await executeGraphQL(query, { id });
  return result.music;
};

// 创建新音乐
export const createMusic = async (musicData) => {
  const { title, artist, cover, url } = musicData;
  const mutation = `
    mutation ($title: String!, $artist: String!, $cover: String, $url: String!) {
      createMusic(title: $title, artist: $artist, cover: $cover, url: $url) {
        id
        title
        artist
        cover
        url
      }
    }
  `;
  
  const result = await executeGraphQL(mutation, { title, artist, cover, url });
  return result.createMusic;
};

// 更新音乐
export const updateMusic = async (id, musicData) => {
  const mutation = `
    mutation ($id: Int!, $title: String, $artist: String, $cover: String, $url: String) {
      updateMusic(id: $id, title: $title, artist: $artist, cover: $cover, url: $url) {
        id
        title
        artist
        cover
        url
      }
    }
  `;
  
  const variables = { id, ...musicData };
  const result = await executeGraphQL(mutation, variables);
  return result.updateMusic;
};

// 删除音乐
export const deleteMusic = async (id) => {
  const mutation = `
    mutation ($id: Int!) {
      deleteMusic(id: $id)
    }
  `;
  
  const result = await executeGraphQL(mutation, { id });
  return result.deleteMusic;
};
