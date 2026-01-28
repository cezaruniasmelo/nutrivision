
import { GoogleGenAI, Type } from "@google/genai";
import { PatientData, ReportData, Gender } from "../types";

// Inicialização única conforme diretrizes
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

const cleanJsonString = (text: string): string => {
  if (!text) return "{}";
  let clean = text.replace(/```json/gi, '').replace(/```/g, '');
  const firstOpen = clean.indexOf('{');
  const lastClose = clean.lastIndexOf('}');
  if (firstOpen !== -1 && lastClose !== -1) {
    clean = clean.substring(firstOpen, lastClose + 1);
  }
  return clean.trim();
};

/**
 * ESTRATÉGIA FLASH: Extração de dados clínicos (OCR & Vision)
 * Modelo: gemini-3-flash-preview (Veloz e Econômico)
 */
export const extractClinicalData = async (input: { text?: string, imageBase64?: string, mimeType?: string }): Promise<Partial<PatientData>> => {
  try {
    const systemInstruction = `
      Você é um especialista em OCR médico de alta performance.
      Sua tarefa é extrair métricas de saúde de documentos e retornar JSON PURO.
      Converta unidades para kg e cm. 
      Se o gênero for identificado, use apenas: "Masculino", "Feminino" ou "Outro".
    `;

    const parts: any[] = [];
    if (input.imageBase64 && input.mimeType) {
      parts.push({
        inlineData: {
          data: input.imageBase64,
          mimeType: input.mimeType
        }
      });
      parts.push({ text: "Extraia os dados deste laudo/foto." });
    } else {
      parts.push({ text: `Analise o texto e extraia os dados: ${input.text}` });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // Roteado para o modelo econômico
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.1,
        // Esquema simplificado para garantir conformidade no Flash
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            age: { type: Type.NUMBER },
            gender: { type: Type.STRING },
            weight: { type: Type.NUMBER },
            height: { type: Type.NUMBER },
            glucose: { type: Type.NUMBER },
            cholesterol: { type: Type.NUMBER },
            bioimpedanceBF: { type: Type.NUMBER }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return {};

    let parsed = JSON.parse(cleanJsonString(text));

    // Normalização de Gênero
    if (parsed.gender) {
      const g = String(parsed.gender).toLowerCase();
      if (g.startsWith("m") || g.includes("homem")) parsed.gender = Gender.MALE;
      else if (g.startsWith("f") || g.includes("mulher")) parsed.gender = Gender.FEMALE;
      else parsed.gender = Gender.OTHER;
    }

    return parsed;
  } catch (error) {
    console.error("Erro na extração Flash:", error);
    return {};
  }
};

/**
 * ESTRATÉGIA PRO: Relatório Metabólico e Raciocínio Clínico
 * Modelo: gemini-3-pro-preview (Inteligência Profunda + Grounding)
 */
const reportSchema = {
  type: Type.OBJECT,
  properties: {
    analise_fisiologica: { type: Type.STRING },
    riscos_identificados: { type: Type.ARRAY, items: { type: Type.STRING } },
    plano_sugerido: { type: Type.STRING },
    referencias_grounding: { type: Type.ARRAY, items: { type: Type.STRING } },
    comparativo_dados: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          metric: { type: Type.STRING },
          source_exam: { type: Type.STRING },
          source_vision: { type: Type.STRING },
          correlation: { type: Type.STRING },
          insight: { type: Type.STRING }
        }
      }
    },
    metabolic_simulation: {
      type: Type.OBJECT,
      properties: {
        basal_metabolic_rate: { type: Type.NUMBER },
        maintenance_calories: { type: Type.NUMBER },
        scenarios: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              adherence_level: { type: Type.STRING },
              description: { type: Type.STRING },
              projected_weight_1yr: { type: Type.NUMBER },
              projected_bf_1yr: { type: Type.NUMBER },
              health_outcome: { type: Type.STRING },
              curve_data: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    month: { type: Type.NUMBER },
                    weight: { type: Type.NUMBER }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  required: ["analise_fisiologica", "riscos_identificados", "metabolic_simulation"]
};

export const generateMetabolicReport = async (patientData: PatientData): Promise<ReportData> => {
  try {
    const systemInstruction = `
      Você é o "Auditor Clínico Sênior". Realize a fusão de dados entre os exames laboratoriais e o fenótipo visual.
      Use o Google Search para referenciar diretrizes médicas reais (ABESO, SBC, OMS).
      Produza uma simulação de futuro baseada no modelo de Kevin Hall.
    `;

    const userPrompt = `
      PACIENTE: ${patientData.name}, ${patientData.age} anos, ${patientData.gender}.
      BIOMETRIA: Peso ${patientData.weight}kg, Altura ${patientData.height}cm.
      OBJETIVO: ${patientData.clinicalGoal}.
      EXTRAS: Glicemia ${patientData.glucose || 'N/A'}, Gordura Corporal ${patientData.bioimpedanceBF || 'N/A'}%.
      
      IMPORTANTE: Analise as imagens do scanner corporal (se fornecidas) para:
      1. Identificar composição corporal visual (definição muscular, dobras cutâneas).
      2. Notar marcas visíveis, assimetrias ou características dermatológicas importantes (verrugas, manchas) para o prontuário.
      3. Estimar pontos de corte para antropometria (circunferência de braço, cintura) se visível.
      4. Correlacionar a postura visual com o risco metabólico.
    `;

    const parts: any[] = [{ text: userPrompt }];

    // Add Scan Images if available
    if (patientData.scanSession) {
      const addImage = (label: string, dataUrl?: string) => {
        if (dataUrl) {
          // Remove prefix data:image/jpeg;base64,
          const base64Data = dataUrl.split(',')[1];
          if (base64Data) {
            parts.push({ text: `[Imagem: ${label}]` });
            parts.push({ inlineData: { mimeType: "image/jpeg", data: base64Data } });
          }
        }
      };

      addImage("Vista Frontal", patientData.scanSession.frontImage);
      addImage("Vista Lateral", patientData.scanSession.sideImage);
      addImage("Vista Traseira", patientData.scanSession.backImage);
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // Roteado para o modelo de alta inteligência
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: reportSchema,
        temperature: 0.2,
        thinkingConfig: { thinkingBudget: 4000 }, // Habilita o raciocínio profundo para o diagnóstico
        tools: [{ googleSearch: {} }] // Grounding científico ativado
      }
    });

    const text = response.text;
    if (!text) throw new Error("IA não retornou dados.");

    return JSON.parse(cleanJsonString(text)) as ReportData;
  } catch (error) {
    console.error("Erro no relatório Pro:", error);
    throw new Error("Falha ao processar inteligência clínica.");
  }
};
