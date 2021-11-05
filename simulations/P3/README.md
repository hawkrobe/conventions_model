This set of simulations considers two different tasks.

1. in `predict_data.wppl`, we yoke our model to the sequence of trials from a pair of human participants, adapting the model on the feedback humans were given (i.e. so the model has seen the same *previous* trials as the human participants). we then look at the model's predictions at the next point in time, along with what the speaker/listener model's top choices are, compared to what humans actually produced. this allows us to compare models based on how well they fit human data. 

2. in `run_simulation.wppl`, we present the same environmental contexts, but rather than asking how the model fits human data, we just set them loose on their own and analyze what kinds of lexical systems they converge on (just like human participants).