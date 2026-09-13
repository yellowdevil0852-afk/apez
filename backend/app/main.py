from fastapi import FastAPI

app = FastAPI(title="Apez")


@app.get("/health")
def health():
    return {"status": "ok"}
