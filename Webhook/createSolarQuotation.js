import * as constants from '../constants.js';
import * as types from '../utils/types.js';
import { createLetter } from "../chatGPT/createDocuments.js";

export const createSolarQuotation = async (req, res) => {
  try {
    const sessionInfo = req.body.sessionInfo;
    const tag = req.body.fulfillmentInfo.tag;

    let threadId = sessionInfo.parameters.threadId
      ? sessionInfo.parameters.threadId
      : generateSessionId(15);

    let textResponse = "Preparing your solar quotation. Please wait...";
    let docName = "Solar Quotation";
    let fileURL = "";


    if (tag !== types.solar.QUOTATION) {
      return res.json({
        fulfillment_response: {
          messages: [{ text: { text: ["Invalid request"] } }]
        }
      });
    }


    const userInputData = cleanJson({
      customer_name: sessionInfo.parameters.customer_name,
      phone: sessionInfo.parameters.phone,
      monthly_bill: sessionInfo.parameters.monthly_bill,
      system_size_kw: sessionInfo.parameters.system_size_kw,
      panel_brand: sessionInfo.parameters.panel_brand,
      inverter_brand: sessionInfo.parameters.inverter_brand,
      base_price: sessionInfo.parameters.base_price,
      subsidy: sessionInfo.parameters.subsidy,
      final_price: sessionInfo.parameters.final_price,
      city: sessionInfo.parameters.city
    });


    const openAiConfig = {
      model: types.openAIModels.GPT4o,
      temperature: 0.2,
      max_tokens: 1200
    };


    const solarTrainingData = `
You are a professional solar energy consultant in India.

Create a formal solar quotation document with:
- Customer details
- Recommended system capacity
- Panel and inverter specifications
- Price breakdown
- Government subsidy
- Final payable amount
- Warranty details
- Disclaimer

Tone: Professional, clear, sales-ready
Currency: INR
`;


    fileURL = `${constants.PUBLIC_BUCKET_URL}/${threadId}/Solar_Quotation_${threadId}.docx`;


    createLetter(
      tag,
      "SOLAR_QUOTATION",
      userInputData,
      solarTrainingData,
      threadId,
      openAiConfig
    );


    res.json({
      fulfillment_response: {
        messages: [{
          text: { text: [textResponse] }
        }]
      },
      sessionInfo: {
        parameters: {
          threadId,
          fileURL,
          docName
        }
      }
    });

  } catch (error) {
    console.error("Solar quotation error:", error);
    res.json({
      fulfillment_response: {
        messages: [{
          text: { text: ["Something went wrong while generating quotation"] }
        }]
      }
    });
  }
};


function cleanJson(jsonData) {
  try {
    let cleaned = JSON.parse(JSON.stringify(jsonData));
    Object.keys(cleaned).forEach(key => {
      if (
        cleaned[key] === null ||
        cleaned[key] === "" ||
        cleaned[key] === "NA"
      ) {
        delete cleaned[key];
      }
    });
    return cleaned;
  } catch {
    return jsonData;
  }
}

function generateSessionId(length) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let sessionId = '';
  for (let i = 0; i < length; i++) {
    sessionId += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return sessionId;
}
