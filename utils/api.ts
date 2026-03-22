
export const fetchJSON = async (url: string, options: RequestInit) => {
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type');
  
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error(`[API] Expected JSON from ${url} but got:`, text.slice(0, 100));
    throw new Error(`Resposta inválida do servidor (${response.status}). O servidor retornou HTML em vez de JSON.`);
  }
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Erro do Servidor (${response.status})`);
  }
  return data;
};
