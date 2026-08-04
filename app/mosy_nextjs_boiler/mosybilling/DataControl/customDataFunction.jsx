"use client";

import { useRouter } from 'next/navigation';

export function customEventHandler(data)
{
    console.log('🎯 Custom Event handler  gave us:', data);

    const actionName = data?.actionName

    const childActionName = { [actionName]: true };
  
    if(childActionName.fuel_station_by_location)
    {
      console.log(`filter sskdj`, data)

      const router = useRouter()
      
      router.push(`../stations/list?fuel_stations_mosyfilter=${btoa(data?.record_id)}`)

    }        
    
}