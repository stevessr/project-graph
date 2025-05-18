// src/core/ai/helpers/apiResponseParser.ts
import { ParsedExpansionResult, ParsedSummaryResult } from "./types";

export async function parseExpansionResponse(
  apiType: string,
  responseData: any,
  rawResponseText: string,
): Promise<ParsedExpansionResult> {
  let content = "";
  try {
    switch (apiType) {
      case "gemini":
        if (responseData?.candidates?.[0]?.content?.parts?.[0]?.text !== undefined) {
          content = responseData.candidates[0].content.parts[0].text;
        } else {
          return { error: "Unexpected Gemini response structure for expansion", rawResponseText, responseData };
        }
        break;
      case "responses":
        if (responseData?.output !== undefined) {
          content = responseData.output;
        } else if (responseData?.choices?.[0]?.message?.content !== undefined) {
          // Fallback for chat-like structure
          content = responseData.choices[0].message.content;
        } else {
          return {
            error: "Unexpected 'responses' API response structure for expansion",
            rawResponseText,
            responseData,
          };
        }
        break;
      case "chat":
      default:
        if (responseData?.choices?.[0]?.message?.content !== undefined) {
          content = responseData.choices[0].message.content;
        } else {
          return { error: "Unexpected chat completions response structure (Expansion)", rawResponseText, responseData };
        }
        break;
    }
    return { suggestions: content.split("\n").filter((line: string) => line.trim() !== "") };
  } catch (e: any) {
    console.error(
      `Error parsing ${apiType} expansion response:`,
      e,
      "Raw Data:",
      responseData,
      "Raw Text:",
      rawResponseText,
    );
    return { error: `Error parsing ${apiType} expansion response: ${e.message}`, rawResponseText, responseData };
  }
}

export async function parseSummaryResponse(
  apiType: string,
  responseData: any,
  rawResponseText: string,
): Promise<ParsedSummaryResult> {
  try {
    switch (apiType) {
      case "gemini":
        if (responseData?.candidates?.[0]?.content?.parts?.[0]?.text !== undefined) {
          return { summary: responseData.candidates[0].content.parts[0].text };
        } else {
          return { error: "Unexpected Gemini response structure for summary", rawResponseText, responseData };
        }
      // For 'responses' in summary, original code throws error before this stage.
      // If it were to reach here, it might follow 'chat' structure.
      case "responses":
      case "chat":
      default:
        if (responseData?.choices?.[0]?.message?.content !== undefined) {
          return { summary: responseData.choices[0].message.content };
        } else {
          return { error: `Unexpected ${apiType} API response structure for summary`, rawResponseText, responseData };
        }
    }
  } catch (e: any) {
    console.error(
      `Error parsing ${apiType} summary response:`,
      e,
      "Raw Data:",
      responseData,
      "Raw Text:",
      rawResponseText,
    );
    return { error: `Error parsing ${apiType} summary response: ${e.message}`, rawResponseText, responseData };
  }
}
