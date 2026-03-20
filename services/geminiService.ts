
import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import { ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const getHealthAdvice = async (history: ChatMessage[], message: string): Promise<{text: string, links: any[]}> => {
  try {
    // Limit history to last 6 messages to keep tokens low and stay within free tier
    const recentHistory = history.slice(-6).map(msg => ({
      role: msg.role,
      parts: msg.parts
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [...recentHistory.flatMap(m => m.parts), { text: message }]
      },
      config: {
        systemInstruction: `Você é o "Saúde Mais AI", um assistente de saúde virtual inteligente e parte da plataforma saudemais.co.mz. 
        Seu objetivo é ajudar usuários com informações sobre medicamentos, sintomas e bem-estar.
        REGRAS:
        1. Você não é um médico. Sempre recomende consulta em Unidades Sanitárias ou Hospitais Centrais.
        2. Use informações atualizadas via Google Search quando necessário.
        3. Fale sobre doenças endêmicas locais com precisão e empatia.
        4. Responda em Português de forma clara e respeitosa.`,
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "Desculpe, não consegui processar sua solicitação.";
    const links = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: any) => chunk.web)
      .filter(Boolean) || [];

    return { text, links };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "Erro ao conectar com o assistente. Verifique sua conexão.", links: [] };
  }
};

export const getHealthNews = async () => {
  const CACHE_KEY = 'health_news_cache';
  const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Quais são as 3 notícias mais importantes de saúde pública hoje? Resuma cada uma em uma frase curta.",
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    
    const result = {
      text: response.text,
      links: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => chunk.web).filter(Boolean) || []
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, timestamp: Date.now() }));
    return result;
  } catch (error) {
    console.error("News Error:", error);
    return { text: "Não foi possível carregar as notícias agora.", links: [] };
  }
};
