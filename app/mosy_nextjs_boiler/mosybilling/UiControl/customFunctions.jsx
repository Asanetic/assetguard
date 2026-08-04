import { closeMosyCard } from "../../components/MosyCard";
import { MosyNotify, MosySnackWidget } from "../../MosyUtils/ActionModals";
import { MosyLiveSearch } from "./customUI";

export function syncWorkSchedule()
{
    //MosyNotify({message :"Holla"})
    MosyLiveSearch()
}


export async function chatWithGPT(userMessage = "") {
    try {
        
        ///MosySnackWidget({content :"Sending request..."})

      const res = await fetch("/api/infowell/smartchat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });
  
      if (!res.ok) {
        throw new Error("Failed to fetch GPT response");
      }

      //closeMosyCard()
      const data = await res.json();
      return data.reply;
    } catch (error) {
      console.error("Chat error:", error.message);
      return "⚠️ GPT chat failed.";
    }
  }
  