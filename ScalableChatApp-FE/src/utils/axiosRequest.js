import axios from 'axios'

const sampleUrl="http://localhost:"

export const axiosRequest=axios.create({
       baseURL:sampleUrl,
})

export const userAxios = axios.create({
       baseURL: 'http://localhost:4002',
})

export const chatAxios = axios.create({
       baseURL: 'http://localhost:4001',
})

export const messageAxios = axios.create({
       baseURL: 'http://localhost:4003',
})
