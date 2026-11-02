import type { FC, ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import { json } from "@remix-run/cloudflare";
import { useActionData, Form, useNavigation, useLoaderData } from "@remix-run/react";
import type { ActionFunction, LoaderFunction } from "@remix-run/cloudflare";
import { createAppContext } from "../context";
import { AppError } from "../services/errors"; 

export const loader: LoaderFunction = async ({ context }) => {
  const appContext = createAppContext(context);
  const { config } = appContext;
  const models = Object.entries(config.CUSTOMER_MODEL_MAP).map(([id, path]) => ({ id, path }));
  return json({ models, config });
};

export const action: ActionFunction = async ({ request, context }: { request: Request; context: any }) => {
  const appContext = createAppContext(context);
  const { imageGenerationService, config } = appContext;

  const formData = await request.formData();
  const prompt = formData.get("prompt") as string;
  const enhance = formData.get("enhance") === "true";
  const modelId = formData.get("model") as string;
  const size = formData.get("size") as string;
  const numSteps = parseInt(formData.get("numSteps") as string, 10);

  if (!prompt) {
    return json({ error: "Prompt is required" }, { status: 400 });
  }

  const model = config.CUSTOMER_MODEL_MAP[modelId];
  if (!model) {
    return json({ error: "Invalid model selected" }, { status: 400 });
  }

  try {
    const result = await imageGenerationService.generateImage(
      enhance ? `---tl ${prompt}` : prompt,
      model,
      size,
      numSteps
    );
    return json(result);
  } catch (error) {
    console.error("Error generating image:", error);
    if (error instanceof AppError) {
      return json({ error: `Image generation failed: ${error.message}` }, { status: error.status || 500 });
    }
    return json({ error: "Image generation failed: Unknown error" }, { status: 500 });
  }
};

const GenerateImage: FC = () => {
  const { models, config } = useLoaderData<typeof loader>();
  const [prompt, setPrompt] = useState("");
  const [enhance, setEnhance] = useState(false);
  const [model, setModel] = useState(config.CUSTOMER_MODEL_MAP["FLUX.1-Schnell-CF"]);
  const [size, setSize] = useState("1024x1024");
  const [numSteps, setNumSteps] = useState(config.FLUX_NUM_STEPS);
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";

  const handleEnhanceToggle = () => {
    setEnhance(!enhance);
  };

  const handleReset = () => {
    setPrompt("");
    setEnhance(false);
    setModel(config.CUSTOMER_MODEL_MAP["FLUX.1-Schnell-CF"]);
    setSize("1024x1024");
    setNumSteps(config.FLUX_NUM_STEPS);
  };

  const handlePromptChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPrompt(e.target.value);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (isSubmitting) {
      e.preventDefault();
    }
  };

  const handleModelChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setModel(e.target.value);
  };

  return (
    // Apple HIG: Grouped Background Color
    <div className="min-h-screen flex items-center justify-center bg-[#F2F2F7] px-4 py-8 font-sans">
      {/* Card Container */}
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-8 max-w-md w-full border border-gray-100">
        
        <h1 className="text-2xl font-bold text-gray-900 mb-8 text-center tracking-tight">
          Generate Images
        </h1>
        
        <Form method="post" className="space-y-6" onSubmit={handleSubmit}>
          
          {/* Prompt Input */}
          <div>
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
              Prompt
            </label>
            <input
              type="text"
              id="prompt"
              name="prompt"
              value={prompt}
              onChange={handlePromptChange}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Describe the image you want..."
              required
            />
          </div>
          
          {/* Model Selection */}
          <div>
            <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
              Model
            </label>
            <select
              id="model"
              name="model"
              value={model}
              onChange={handleModelChange}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none"
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.id}
                </option>
              ))}
            </select>
          </div>
          
          {/* Grid for Size and Steps */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-2">
                Size
              </label>
              <select
                id="size"
                name="size"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none"
              >
                <option value="512x512">512x512</option>
                <option value="768x768">768x768</option>
                <option value="1024x1024">1024x1024</option>
              </select>
            </div>
            <div>
              <label htmlFor="numSteps" className="block text-sm font-medium text-gray-700 mb-2">
                Steps
              </label>
              <input
                type="number"
                id="numSteps"
                name="numSteps"
                value={numSteps}
                onChange={(e) => setNumSteps(parseInt(e.target.value, 10))}
                min="4"
                max="8"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Actions - Stacked full-width for mobile (Apple style) */}
          <div className="flex flex-col space-y-3 pt-4">
            <button
              type="button"
              onClick={handleEnhanceToggle}
              className={`w-full px-4 py-3 rounded-xl text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                          ${enhance ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
              disabled={isSubmitting}
            >
              {enhance ? "Prompt Enhancement ON" : "Enhance Prompt"}
            </button>
            
            <input type="hidden" name="enhance" value={enhance.toString()} />
            
            <button
              type="submit"
              className={`w-full px-4 py-3 rounded-xl text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                          ${isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-[#007AFF] hover:bg-blue-600"}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Generating..." : "Generate Image"}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="w-full px-4 py-3 rounded-xl text-sm font-semibold text-red-500 bg-white hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              disabled={isSubmitting}
            >
              Reset Fields
            </button>
          </div>
        </Form>
        
        {/* Error Message */}
        {actionData?.error && (
          <div className="mt-6 p-4 bg-red-50 rounded-xl border border-red-100">
            <p className="text-sm text-red-600 text-center font-medium">{actionData.error}</p>
          </div>
        )}

        {/* Image Output */}
        {actionData && actionData.image && (
          <div className="mt-8 border-t border-gray-100 pt-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Result</h2>
            <img 
              src={`data:image/jpeg;base64,${actionData.image}`} 
              alt="Generated" 
              className="w-full rounded-2xl shadow-sm border border-gray-200 object-cover" 
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerateImage;