
import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import { ChatMessage } from "../types";

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("A chave API do Gemini não foi configurada. Por favor, adicione GEMINI_API_KEY nas definições.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

export const getHealthAdvice = async (history: ChatMessage[], message: string): Promise<{text: string, links: any[]}> => {
  try {
    const ai = getAI();
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
    if (error instanceof Error && error.message.includes("API key")) {
      return { text: "Erro de configuração: Chave API inválida ou ausente.", links: [] };
    }
    return { text: "Erro ao conectar com o assistente. Verifique sua conexão.", links: [] };
  }
};

export const getHealthNews = async (forceRefresh = false) => {
  const CACHE_KEY = 'health_news_cache';
  const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

  try {
    if (!forceRefresh) {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return data;
        }
      }
    }

    const ai = getAI();
    let response;
    
    try {
      // Primary attempt with Google Search grounding for real-time Mozambique news
      response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Pesquise e liste as 3 notícias mais importantes e recentes de saúde pública em Moçambique hoje. Resuma cada uma em uma frase curta e informativa.",
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
    } catch (searchError) {
      console.warn("Google Search grounding failed, falling back to general model knowledge:", searchError);
      // Fallback to general knowledge if search tool fails (e.g., regional restriction or quota)
      response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Quais são as notícias de saúde pública mais importantes e recentes em Moçambique? Liste as 3 principais e resuma cada uma em uma frase curta.",
      });
    }
    
    if (!response.text) {
      throw new Error("O modelo retornou uma resposta vazia.");
    }

    const result = {
      text: response.text,
      links: response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((chunk: any) => chunk.web)
        .filter(Boolean) || []
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, timestamp: Date.now() }));
    return result;
  } catch (error) {
    console.error("Detailed News Error:", error);
    
    // Check if it's a configuration error
    if (error instanceof Error && (error.message.includes("chave API") || error.message.includes("API key"))) {
      return { 
        text: "Configuração pendente: A chave API do Gemini não foi encontrada. Por favor, configure-a nas definições do projeto.", 
        links: [] 
      };
    }

    return { 
      text: "Não foi possível carregar as notícias de saúde de Moçambique no momento. Por favor, tente novamente mais tarde.", 
      links: [] 
    };
  }
};
