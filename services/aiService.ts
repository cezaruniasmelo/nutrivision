
import { GoogleGenAI, Type } from "@google/genai";
import { PatientData, ReportData, Gender } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- ANALISE DE DOCUMENTOS (OCR & VISION TO JSON) ---

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
 * Extrai dados clínicos de texto ou de uma imagem base64.
 */
export const extractClinicalData = async (input: { text?: string, imageBase64?: string, mimeType?: string }): Promise<Partial<PatientData>> => {
  try {
    const systemPrompt = `
      Você é um especialista em OCR médico e extração de dados clínicos.
      Analise o documento (texto ou imagem) fornecido e extraia as métricas em JSON.
      
      Chaves esperadas:
      - name (string)
      - age (number)
      - gender (string: "Masculino", "Feminino", "Outro")
      - weight (number)
      - height (number)
      - glucose (number)
      - cholesterol (number)
      - bioimpedanceBF (number)

      Regras:
      - Extraia apenas o que estiver explícito ou óbvio no documento.
      - Converta unidades para kg e cm se necessário.
      - Se não encontrar um campo, omita-o do JSON.
      - Retorne APENAS o JSON puro.
    `;

    let parts: any[] = [{ text: systemPrompt }];
    
    if (input.imageBase64 && input.mimeType) {
      parts.push({
        inlineData: {
          data: input.imageBase64,
          mimeType: input.mimeType
        }
      });
      parts.push({ text: "Analise esta imagem e extraia os dados clínicos." });
    } else if (input.text) {
      parts.push({ text: `Texto extraído do documento: \n\n ${input.text}` });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      }
    });

    const responseText = response.text;
    if (!responseText) return {};
    
    let parsed: any = {};
    try {
        parsed = JSON.parse(cleanJsonString(responseText));
    } catch (e) {
        console.warn("Falha no parse do JSON multimodal", e);
        return {};
    }
    
    // Normalização de Gênero
    if (parsed.gender) {
        const g = String(parsed.gender).toLowerCase();
        if (g.startsWith("m") || g.includes("homem")) parsed.gender = Gender.MALE;
        else if (g.startsWith("f") || g.includes("mulher")) parsed.gender = Gender.FEMALE;
        else parsed.gender = Gender.OTHER;
    }
    
    return parsed;

  } catch (error) {
    console.error("Erro na extração multimodal:", error);
    return {};
  }
};

// --- RELATÓRIO METABÓLICO ---

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
          correlation: { type: Type.STRING, enum: ["high", "medium", "low"] },
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
              id: { type: Type.STRING, enum: ["inertia", "partial", "total"] },
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
  required: ["analise_fisiologica", "riscos_identificados", "comparativo_dados", "metabolic_simulation"]
};

export const generateMetabolicReport = async (patientData: PatientData): Promise<ReportData> => {
  try {
    const systemPrompt = `
      Você é o "Auditor Clínico Sênior" do NutriVision AI.
      Sua função é realizar a "Data Fusion": Validar se o que o exame de papel diz condiz com o fenótipo visual.
      Utilize a ferramenta de busca para basear seus planos e referências em diretrizes médicas atuais (OMS, ABESO, SBC).
      
      IMPORTANTE:
      - Seja conciso.
      - "curve_data": Gere 5 pontos (meses 0, 6, 12, 18, 24).
    `;

    const userContent = `
      PACIENTE: ${patientData.name}, ${patientData.age} anos, ${patientData.gender}.
      BIOMETRIA: Peso ${patientData.weight}kg, Altura ${patientData.height}cm.
      OBJETIVO: ${patientData.clinicalGoal}.
      DADOS ADICIONAIS: Glicemia ${patientData.glucose || 'N/A'}, Colesterol ${patientData.cholesterol || 'N/A'}.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: userContent,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: reportSchema,
        temperature: 0.1,
        tools: [{ googleSearch: {} }] // Ativa busca para grounding científico
      }
    });

    const responseText = response.text;
    if (!responseText) throw new Error("Resposta da IA vazia.");
    
    const parsedData = JSON.parse(cleanJsonString(responseText)) as ReportData;

    // Se a IA retornar fontes no groundingMetadata, poderíamos injetá-las aqui, 
    // mas o schema já pede para a IA listar as referências textualmente.
    
    return parsedData;

  } catch (error) {
    console.error("Erro ao gerar relatório:", error);
    throw new Error("Falha na simulação metabólica.");
  }
};
