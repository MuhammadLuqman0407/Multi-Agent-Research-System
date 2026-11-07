from AI_services.pipeline import run_research_pipeline

if __name__ == "__main__":
    topic = input("\nEnter a research topic: ")
    result = run_research_pipeline(topic)
    print("\nFinal Report\n")
    print(result["report"])
    print("\nCritic Review\n")
    print(result["feedback"])
