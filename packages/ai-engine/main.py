from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services.sanjivani_optimizer import optimize_sanjivani_recipe, TelemetryInput, RecipeResponse
from services.odor_predictor import predict_micro_atmospheric_odor, OdorPredictionInput, OdorPredictionOutput
from services.texture_analyzer import analyze_compost_texture, TextureAnalysisRequest, TextureAnalysisResponse
from services.variance_engine import evaluate_sensor_variance, VarianceCheckRequest, VarianceCheckResponse

app = FastAPI(
    title="Prithvi Grid AI Algorithmic Engine",
    description="Python FastAPI Microservice powering Sanjivani, Odor Predictor, Texture Vision & Kaam Ka Saboot",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "Prithvi Grid Python AI Engine",
        "version": "1.0.0"
    }

@app.post("/sanjivani/optimize-recipe", response_model=RecipeResponse)
def get_sanjivani_recipe(data: TelemetryInput):
    return optimize_sanjivani_recipe(data)

@app.post("/odor/predict", response_model=OdorPredictionOutput)
def get_odor_prediction(data: OdorPredictionInput):
    return predict_micro_atmospheric_odor(data)

@app.post("/texture/analyze-frame", response_model=TextureAnalysisResponse)
def get_texture_analysis(data: TextureAnalysisRequest):
    return analyze_compost_texture(data)

@app.post("/verification/variance-score", response_model=VarianceCheckResponse)
def get_variance_score(data: VarianceCheckRequest):
    return evaluate_sensor_variance(data)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
