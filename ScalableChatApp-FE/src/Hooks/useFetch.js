import {useEffect, useState} from 'react'
import axios from 'axios'
import {chatAxios}  from '../utils/axiosRequest'

const useFetch = (url) =>{
      
       const [data,setData]  = useState([])
       const [loading,setLoading]  = useState(false)
       const [error,setError]  = useState(false)

       useEffect(()=>{
              const fetchData = async ()=>{
                     setLoading(true)
                     try {
                            const res  = await chatAxios.get(url,{withCredentials:true})
                            setData(res.data)
                     } catch (error) {
                            setError(error)
                     }
                     setLoading(false)
              }
              fetchData();
       },[url])


       const refetchData = async ()=>{
              setLoading(true)
              try {
                     const res  = await chatAxios.get(url,{withCredentials:true})
                     setData(res.data)
              } catch (error) {
                     setError(error) 
              }
              setLoading(false)
       }

       return {data,loading,error,refetchData}

}


export default useFetch