import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createNewRecipe, fetchIngredients, fetchRecipeById, updateRecipe, checkRecipeNameExists } from '../reducers/recipes/recipesApi';
import {
    setIngredients,
    setStatus,
    setError,
    clearError
} from '../reducers/recipes/recipesSlice';
import { useNavigate, useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import * as yup from 'yup';
import './recipeForm.css';

const initialStep = { step_number: 1, step_instructions: '', ingredients: [] };
const initialIngredient = { ingredient_id: '', quantity: '', unit: '' };
const initialRecipeData = {
  recipeName: '',
  steps: [{ ...initialStep }],
  ingredientsList: [],
};

// Yup schema for validation
const recipeSchema = yup.object().shape({
    recipeName: yup
        .string()
        .trim()
        .min(3, 'Recipe name must be at least 3 characters long')
        .max(100, 'Recipe name must be at most 100 characters long')
        .required('Recipe name is required'),
    steps: yup
        .array()
        .of(
            yup.object().shape({
                step_number: yup.number().integer().min(1).required(),
                step_instructions: yup
                    .string()
                    .trim()
                    .min(10, 'Step instructions must be at least 10 characters long')
                    .max(200, 'Step instructions must be at most 200 characters long')
                    .required('Step instructions are required'),
                ingredients: yup
                    .array()
                    .of(
                        yup.object().shape({
                            ingredient_id: yup
                                .number()
                                .transform((value, originalValue) => originalValue === '' ? undefined : value)
                                .integer()
                                .positive()
                                .required('No ingredient selected'),
                            quantity: yup
                                .number()
                                .transform((value, originalValue) => originalValue === '' ? undefined : value)
                                .positive('Quantity must be positive')
                                .required('Quantity is required'),
                        })
                    )
                    .optional(),
            })
        )
        .min(1, 'At least one step is required')
        .required('Steps are required'),
});

// Add this utility function near the top, after your schema definition
const validateField = async (path, value) => {
    try {
        await recipeSchema.validateAt(path, value);
        return '';
    } catch (err) {
        return err.message;
    }
};

const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result.map((step, idx) => ({ ...step, step_number: idx + 1 }));
};

const RecipeForm = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { id: recipeId } = useParams();
    const status = useSelector((state) => state.recipes.status);
    const error = useSelector((state) => state.recipes.error);
    const ingredientsStatus = useSelector((state) => state.recipes.ingredientsStatus);
    const reduxIngredientsList = useSelector((state) => state.recipes.ingredients);

    const [recipeData, setRecipeData] = useState(initialRecipeData);
    const [originalRecipeName, setOriginalRecipeName] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [fieldErrors, setFieldErrors] = useState([]);
    const [nameStatus, setNameStatus] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const nameCheckTimeout = React.useRef();

    // Keep ingredientsList in sync with redux
    useEffect(() => {
        setRecipeData((prev) => ({
            ...prev,
            ingredientsList: reduxIngredientsList,
        }));
    }, [reduxIngredientsList]);

    // Fetch ingredients on mount
    useEffect(() => {
        if (status === 'idle') {
            const loadIngredients = async () => {
                dispatch(setStatus('loading'));
                try {
                    const response = await fetchIngredients();
                    dispatch(setIngredients(response.data));
                } catch (err) {
                    dispatch(setError(err.message));
                }
            };
            loadIngredients();
        }
    }, [dispatch, status]);

    // Fetch recipe details if recipeId is present (edit mode)
    useEffect(() => {
        let isMounted = true;
        const loadData = async () => {
            dispatch(setStatus('loading'));
            try {
                const [ingredientsRes, recipeRes] = await Promise.all([
                    fetchIngredients(),
                    recipeId ? fetchRecipeById(recipeId) : Promise.resolve({ data: null })
                ]);
                if (!isMounted) return;
                dispatch(setIngredients(ingredientsRes.data));
                if (recipeRes.data) {
                    const recipe = recipeRes.data.recipe || recipeRes.data;
                    setRecipeData((prev) => ({
                        ...prev,
                        recipeName: recipe.recipe_name,
                        steps: recipe.steps.map((step) => ({
                            step_number: step.step_number,
                            step_instructions: step.step_instructions,
                            ingredients: (step.ingredients || []).map((ing) => ({
                                ingredient_id: ing.ingredient_id,
                                quantity: ing.quantity,
                                unit: ing.unit,
                            })),
                        }))
                    }));
                    setOriginalRecipeName(recipe.recipe_name);
                }
                dispatch(setStatus('succeeded'));
            } catch (err) {
                if (!isMounted) return;
                dispatch(setError(err.message));
                dispatch(setStatus('failed'));
            }
        };
        loadData();
        return () => { isMounted = false; };
    }, [dispatch, recipeId]);

  

    // Validate first step on initial mount (on loading the recipe form)
    useEffect(() => {
        recipeSchema
            .validate(recipeData, { abortEarly: false })
            .then(() => setFieldErrors([]))
            .catch((err) => {
                const errors = {};
                err.inner.forEach((validationError) => {
                    if (validationError.path) {
                        const match = validationError.path.match(/^steps\[(\d+)\](?:\.ingredients\[(\d+)\])?\.(\w+)$/);
                        if (match) {
                            const [, stepIdx, ingIdx, field] = match;
                            errors.steps = errors.steps || {};
                            errors.steps[stepIdx] = errors.steps[stepIdx] || {};
                            if (ingIdx !== undefined) {
                                errors.steps[stepIdx].ingredients = errors.steps[stepIdx].ingredients || {};
                                errors.steps[stepIdx].ingredients[ingIdx] = errors.steps[stepIdx].ingredients[ingIdx] || {};
                                errors.steps[stepIdx].ingredients[ingIdx][field] = validationError.message;
                            } else if (validationError.path === "recipeName") {
                                errors.recipe_name = validationError.message;
                            } else {
                                errors[validationError.path] = validationError.message;
                            }
                        }
                    }
                });
                setFieldErrors(errors);
            });
        // Only run on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Recipe name change and duplicate check
    const handleRecipeNameChange = async (e) => {
        const value = e.target.value;
        setRecipeData((prev) => ({ ...prev, recipeName: value }));
        setNameStatus('');

        // Per-field validation
        const errorMsg = await validateField('recipeName', { ...recipeData, recipeName: value });
        setFieldErrors((prev) => ({ ...prev, recipe_name: errorMsg }));

        if (nameCheckTimeout.current) clearTimeout(nameCheckTimeout.current);

        if (
            value.trim().length >= 3 &&
            (!recipeId || value.trim() !== originalRecipeName.trim())
        ) {
            nameCheckTimeout.current = setTimeout(async () => {
                const exists = await checkRecipeNameExists(value.trim());
                if (exists) {
                    setFieldErrors((prev) => ({ ...prev, recipe_name: 'Recipe name already exists' }));
                    setNameStatus('');
                } else if (!errorMsg) {
                    setFieldErrors((prev) => ({ ...prev, recipe_name: '' }));
                    setNameStatus('Recipe name is OK');
                }
            }, 400);
        } else {
            if (!errorMsg) {
                setFieldErrors((prev) => ({ ...prev, recipe_name: '' }));
            }
            if (
                value.trim().length >= 3 &&
                (!recipeId || value.trim() !== originalRecipeName.trim())
            ) {
                setNameStatus('Recipe name is OK');
            } else {
                setNameStatus('');
            }
        }
    };

    // Step instructions change
    const handleStepChange = async (idx, field, value) => {
        dispatch(clearError());
        const updatedSteps = recipeData.steps.map((step, sIdx) =>
            sIdx === idx ? { ...step, [field]: value } : step
        );
        setRecipeData((prev) => ({ ...prev, steps: updatedSteps }));

        // Per-field validation
        const path = `steps[${idx}].${field}`;
        const errorMsg = await validateField(path, { ...recipeData, steps: updatedSteps });
        setFieldErrors((prev) => {
            const updated = { ...prev, steps: { ...(prev.steps || {}) } };
            updated.steps[idx] = { ...(updated.steps[idx] || {}) };
            updated.steps[idx][field] = errorMsg;
            return updated;
        });
    };

    // Ingredient field change
    const handleIngredientChange = async (stepIdx, ingIdx, field, value) => {
        dispatch(clearError());
        const updatedSteps = recipeData.steps.map((step, sIdx) => {
            if (sIdx !== stepIdx) return step;
            const updatedIngredients = step.ingredients.map((ing, iIdx) => {
                if (iIdx !== ingIdx) return ing;
                if (field === 'ingredient_id') {
                    const selected = recipeData.ingredientsList.find(
                        ingredient => String(ingredient.ing_id || ingredient.ingredient_id) === value
                    );
                    return {
                        ...ing,
                        ingredient_id: value,
                        unit: selected ? (selected.unit || '') : '',
                    };
                }
                return { ...ing, [field]: value };
            });
            return { ...step, ingredients: updatedIngredients };
        });
        setRecipeData((prev) => ({ ...prev, steps: updatedSteps }));

        // Per-field validation
        const path = `steps[${stepIdx}].ingredients[${ingIdx}].${field}`;
        const errorMsg = await validateField(path, { ...recipeData, steps: updatedSteps });
        setFieldErrors((prev) => {
            const updated = { ...prev, steps: { ...(prev.steps || {}) } };
            updated.steps[stepIdx] = { ...(updated.steps[stepIdx] || {}), ingredients: { ...(prev.steps?.[stepIdx]?.ingredients || {}) } };
            updated.steps[stepIdx].ingredients[ingIdx] = { ...(updated.steps[stepIdx].ingredients[ingIdx] || {}) };
            updated.steps[stepIdx].ingredients[ingIdx][field] = errorMsg;
            return updated;
        });
    };

    // Add/remove steps and ingredients
    const addStep = () => {
        setRecipeData((prev) => ({
            ...prev,
            steps: [...prev.steps, { ...initialStep, step_number: prev.steps.length + 1 }],
        }));
    };

    const removeStep = (idx) => {
        setRecipeData((prev) => ({
            ...prev,
            steps: prev.steps.filter((_, sIdx) => sIdx !== idx).map((step, i) => ({
                ...step,
                step_number: i + 1,
            }))
        }));
    };

    const addIngredient = (stepIdx) => {
        setFieldErrors((prev) => {
            const updated = { ...prev };
            if (updated.steps && updated.steps[stepIdx] && updated.steps[stepIdx].ingredients) {
                updated.steps[stepIdx].ingredients = {};
            }
            return updated;
        });
        setRecipeData((prev) => ({
            ...prev,
            steps: prev.steps.map((step, sIdx) =>
                sIdx === stepIdx
                    ? { ...step, ingredients: [...step.ingredients, { ...initialIngredient }] }
                    : step
            ),
        }));
    };

    const removeIngredient = (stepIdx, ingIdx) => {
        setRecipeData((prev) => ({
            ...prev,
            steps: prev.steps.map((step, sIdx) => {
                if (sIdx !== stepIdx) return step;
                return {
                    ...step,
                    ingredients: step.ingredients.filter((_, iIdx) => iIdx !== ingIdx),
                };
            }),
        }));

        setFieldErrors(prev => {
            if (
                !prev.steps ||
                !prev.steps[stepIdx] ||
                !prev.steps[stepIdx].ingredients
            ) {
                return prev;
            }

            const updated = { ...prev, steps: { ...prev.steps } };
            updated.steps[stepIdx] = { ...updated.steps[stepIdx] };
            updated.steps[stepIdx].ingredients = { ...updated.steps[stepIdx].ingredients };

            delete updated.steps[stepIdx].ingredients[ingIdx];

            const newIngredientsErrors = {};
            Object.keys(updated.steps[stepIdx].ingredients)
                .map(Number)
                .sort((a, b) => a - b)
                .forEach(i => {
                    if (i < ingIdx) {
                        newIngredientsErrors[i] = updated.steps[stepIdx].ingredients[i];
                    } else if (i > ingIdx) {
                        newIngredientsErrors[i - 1] = updated.steps[stepIdx].ingredients[i];
                    }
                });
            updated.steps[stepIdx].ingredients = newIngredientsErrors;

            return updated;
        });
    };

    // Handle form submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        setFieldErrors([]);

        try {
            await recipeSchema.validate(recipeData, { abortEarly: false });
        } catch (err) {
            // Collect and display all validation errors
            if (err.inner && err.inner.length > 0) {
                const errors = {};
                err.inner.forEach((validationError) => {
                    if (validationError.path) {
                        const match = validationError.path.match(/^steps\[(\d+)\](?:\.ingredients\[(\d+)\])?\.(\w+)$/);
                        if (match) {
                            const [, stepIdx, ingIdx, field] = match;
                            errors.steps = errors.steps || {};
                            errors.steps[stepIdx] = errors.steps[stepIdx] || {};
                            if (ingIdx !== undefined) {
                                errors.steps[stepIdx].ingredients = errors.steps[stepIdx].ingredients || {};
                                errors.steps[stepIdx].ingredients[ingIdx] = errors.steps[stepIdx].ingredients[ingIdx] || {};
                                errors.steps[stepIdx].ingredients[ingIdx][field] = validationError.message;
                            } else if (validationError.path === "recipeName") {
                                errors.recipe_name = validationError.message;
                            } else {
                                errors[validationError.path] = validationError.message;
                            }
                        }
                    }
                });
                setFieldErrors(errors);
                return;
            } else {
                setFieldErrors({ form: err.message });
                return;
            }
        }

        dispatch(setStatus('loading'));
        const submitData = {
            recipe_name: recipeData.recipeName,
            steps: recipeData.steps.map((step, idx) => {
                const filteredIngredients = step.ingredients
                    .filter(eng => eng.ingredient_id && eng.quantity);
                return {
                    step_number: idx + 1,
                    step_instructions: step.step_instructions,
                    ...(filteredIngredients.length > 0
                        ? {
                            ingredients: filteredIngredients.map(ing => ({
                                ingredient_id: Number(ing.ingredient_id),
                                quantity: Number(ing.quantity),
                            })),
                        }
                        : {}),
                };
            }),
        };
        try {
            const response = recipeId
                ? await updateRecipe(recipeId, submitData)
                : await createNewRecipe(submitData);

            if (
                response &&
                response.data &&
                (
                    (recipeId && response.data.updatedRecipe && response.data.updatedRecipe.recipe_id) ||
                    (!recipeId && response.data.createdRecipe && response.data.createdRecipe.recipe_id)
                )
            ) {
                const id = recipeId
                    ? response.data.updatedRecipe.recipe_id
                    : response.data.createdRecipe.recipe_id;
                navigate(`/recipes/${id}`, { state: { successMessage: recipeId ? 'Recipe updated successfully!' : 'Recipe created successfully!' } });
            } else {
                dispatch(setStatus('failed'));
                dispatch(setError('Recipe created/updated but no ID returned.'));
            }
            dispatch(setStatus('idle'));
        } catch (err) {
            dispatch(setError(err.message)); // For global/API errors
            setFieldErrors({ form: err.message }); // For form-level errors
            setIsSubmitting(false);
            dispatch(setStatus('idle'));
        }
    };

    const handleDragEnd = (result) => {
        if (!result.destination) return;
        const newSteps = reorder(recipeData.steps, result.source.index, result.destination.index);
        setRecipeData((prev) => ({ ...prev, steps: newSteps }));
    };

    useEffect(() => {
        if (!recipeId) {
            setRecipeData(initialRecipeData);
            setOriginalRecipeName('');
            setFieldErrors([]);
            setNameStatus('');
            setSuccessMessage('');
        }
    }, [recipeId]);

    // Utility: check if the last step has any errors
    const hasStepErrors = (stepIdx) => {
        if (!fieldErrors.steps || !fieldErrors.steps[stepIdx]) return false;
        const stepErr = fieldErrors.steps[stepIdx];
        // Check for step_instructions error
        if (stepErr.step_instructions) return true;
        // Check for ingredient errors in this step
        if (stepErr.ingredients) {
            return Object.values(stepErr.ingredients).some(
                ingErr => ingErr && (ingErr.ingredient_id || ingErr.quantity)
            );
        }
        return false;
    };

    // Returns true if the last ingredient in the step has any errors
    const lastIngredientHasErrors = (stepIdx) => {
        if (
            !fieldErrors.steps ||
            !fieldErrors.steps[stepIdx] ||
            !fieldErrors.steps[stepIdx].ingredients
        ) {
            return false;
        }
        const ingredientsErrors = fieldErrors.steps[stepIdx].ingredients;
        const step = recipeData.steps[stepIdx];
        if (!step || !step.ingredients || step.ingredients.length === 0) return false;
        const lastIdx = step.ingredients.length - 1;
        const lastIngErr = ingredientsErrors[lastIdx];
        return lastIngErr && (lastIngErr.ingredient_id || lastIngErr.quantity);
    };

    // Returns true if any ingredient in the step has errors
    const anyIngredientHasErrors = (stepIdx) => {
        if (
            !fieldErrors.steps ||
            !fieldErrors.steps[stepIdx] ||
            !fieldErrors.steps[stepIdx].ingredients
        ) {
            return false;
        }
        return Object.values(fieldErrors.steps[stepIdx].ingredients).some(
            ingErr => ingErr && (ingErr.ingredient_id || ingErr.quantity)
        );
    };

    // Returns true if all ingredients in the step are valid (no errors and no blank fields)
    const allIngredientsValid = (stepIdx) => {
        const step = recipeData.steps[stepIdx];
        if (!step || !step.ingredients || step.ingredients.length === 0) return true;

        // Check for blank fields
        for (const ing of step.ingredients) {
            if (!ing.ingredient_id || !ing.quantity) {
                return false;
            }
        }

        // Check for validation errors
        if (
            fieldErrors.steps &&
            fieldErrors.steps[stepIdx] &&
            fieldErrors.steps[stepIdx].ingredients
        ) {
            for (const ingErr of Object.values(fieldErrors.steps[stepIdx].ingredients)) {
                if (ingErr && (ingErr.ingredient_id || ingErr.quantity)) {
                    return false;
                }
            }
        }

        return true;
    };

    const hasAnyError =
        !!fieldErrors.form ||
        !!fieldErrors.recipe_name ||
        (fieldErrors.steps && Object.values(fieldErrors.steps).some(
            step =>
            (step && (
                step.step_instructions ||
                (step.ingredients && Object.values(step.ingredients).some(
                    ing => ing.ingredient_id || ing.quantity
                ))
            ))
        ));

    const isReadyToFill =
        ingredientsStatus === 'succeeded' &&
        recipeData.ingredientsList.length > 0 &&
        !error;

    const handleFocus = (field) => {
        // Example: clear error for this field
        setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    };

    const handleBlur = (fieldPath) => {
        validateField(fieldPath, recipeData).then((errorMsg) => {
            // Map the error to the correct place in fieldErrors
            if (fieldPath === 'recipeName') {
                setFieldErrors((prev) => ({ ...prev, recipe_name: errorMsg }));
            } else {
                // For nested fields like steps[0].step_instructions or steps[0].ingredients[1].quantity
                const match = fieldPath.match(/^steps\[(\d+)\](?:\.ingredients\[(\d+)\])?\.(\w+)$/);
                if (match) {
                    const [, stepIdx, ingIdx, field] = match;
                    setFieldErrors((prev) => {
                        const updated = { ...prev, steps: { ...(prev.steps || {}) } };
                        updated.steps[stepIdx] = { ...(updated.steps[stepIdx] || {}) };
                        if (ingIdx !== undefined) {
                            updated.steps[stepIdx].ingredients = { ...(updated.steps[stepIdx].ingredients || {}) };
                            updated.steps[stepIdx].ingredients[ingIdx] = { ...(updated.steps[stepIdx].ingredients[ingIdx] || {}) };
                            updated.steps[stepIdx].ingredients[ingIdx][field] = errorMsg;
                        } else {
                            updated.steps[stepIdx][field] = errorMsg;
                        }
                        return updated;
                    });
                }
            }
        });
    };

    return (
        <div className="recipe-detail-card">
            <h2 className="recipe-detail-title">
                {recipeId ? 'Edit Recipe' : 'Create New Recipe'}
            </h2>
            {!isReadyToFill ? (
                <div className="loading-message">
                    Loading ingredients, please wait...
                    {error && (
                        <div className="error-message">
                            {typeof error === 'string' ? error : 'An error occurred.'}
                        </div>
                    )}
                </div>
            ) : (
                <form onSubmit={handleSubmit}>
                    <div>
                        <label>
                            Recipe Name: <span className="required">*</span>
                            <input
                                type="text"
                                value={recipeData.recipeName}
                                onChange={handleRecipeNameChange}
                                required
                                className={fieldErrors.recipe_name ? 'input-error' : ''}
                                onFocus={() => handleFocus('recipe_name')}
                                onBlur={() => handleBlur('recipeName')}
                            />
                        </label>
                        {fieldErrors.recipe_name && (
                            <div className="error-message">{fieldErrors.recipe_name}</div>
                        )}
                        {!fieldErrors.recipe_name && nameStatus === 'Recipe name is OK' && (
                            <div className="success-message">Recipe name is OK!</div>
                        )}
                    </div>
                    <h3 className="recipe-detail-steps-title">Steps</h3>
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="steps-droppable">
                            {(provided) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                >
                                    {recipeData.steps.map((step, stepIdx) => (
                                        <Draggable key={stepIdx} draggableId={`step-${stepIdx}`} index={stepIdx}>
                                            {(provided, snapshot) => (
                                                <div
                                                    className={`recipe-detail-step${snapshot.isDragging ? ' dragging' : ''}`}
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                >
                                                    <div className="step-header">
                                                        <div className="step-label">
                                                            Step {stepIdx + 1} Instructions: <span className="required">*</span>
                                                        </div>
                                                        <textarea
                                                            value={step.step_instructions}
                                                            onChange={e => handleStepChange(stepIdx, 'step_instructions', e.target.value)}
                                                            required
                                                            className={
                                                                fieldErrors.steps &&
                                                                fieldErrors.steps[stepIdx] &&
                                                                fieldErrors.steps[stepIdx].step_instructions
                                                                    ? 'input-error'
                                                                    : ''
                                                            }
                                                            onBlur={() => handleBlur(`steps[${stepIdx}].step_instructions`)}
                                                        />
                                                        {fieldErrors.steps &&
                                                            fieldErrors.steps[stepIdx] &&
                                                            fieldErrors.steps[stepIdx].step_instructions && (
                                                                <div className="error-message">
                                                                    {fieldErrors.steps[stepIdx].step_instructions}
                                                                </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="recipe-detail-ingredients-title">Ingredients:</div>
                                                        {step.ingredients.map((ing, ingIdx) => (
                                                            <div key={ingIdx} className="ingredient-row">
                                                                <label className="ingredient-label">
                                                                    <span>Ingredient</span>
                                                                    <span className="required">*</span>
                                                                    <select
                                                                        value={ing.ingredient_id}
                                                                        onChange={e => handleIngredientChange(stepIdx, ingIdx, 'ingredient_id', e.target.value)}
                                                                        required
                                                                        className={
                                                                            fieldErrors.steps &&
                                                                            fieldErrors.steps[stepIdx] &&
                                                                            fieldErrors.steps[stepIdx].ingredients &&
                                                                            fieldErrors.steps[stepIdx].ingredients[ingIdx] &&
                                                                            fieldErrors.steps[stepIdx].ingredients[ingIdx].ingredient_id
                                                                                ? 'input-error'
                                                                                : ''
                                                                        }
                                                                        onBlur={() => handleBlur(`steps[${stepIdx}].ingredients[${ingIdx}].ingredient_id`)}
                                                                    >
                                                                        <option value="">Select Ingredient</option>
                                                                        {recipeData.ingredientsList.map(ingredient => (
                                                                            <option
                                                                                key={ingredient.ing_id}
                                                                                value={ingredient.ing_id}
                                                                            >
                                                                                {ingredient.ingr_name || ingredient.ingredient_name || ingredient.name}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </label>
                                                                <label className="ingredient-label">
                                                                    <span>Qty</span>
                                                                    <span className="required">*</span>
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Qty"
                                                                        value={ing.quantity}
                                                                        onChange={e => handleIngredientChange(stepIdx, ingIdx, 'quantity', e.target.value)}
                                                                        className={
                                                                            fieldErrors.steps &&
                                                                            fieldErrors.steps[stepIdx] &&
                                                                            fieldErrors.steps[stepIdx].ingredients &&
                                                                            fieldErrors.steps[stepIdx].ingredients[ingIdx] &&
                                                                            fieldErrors.steps[stepIdx].ingredients[ingIdx].quantity
                                                                                ? 'input-error'
                                                                                : ''
                                                                        }
                                                                        onBlur={() => handleBlur(`steps[${stepIdx}].ingredients[${ingIdx}].quantity`)}
                                                                    />
                                                                    <input
                                                                    type="text"
                                                                    value={ing.unit}
                                                                    disabled
                                                                    className="ingredient-unit"
                                                                />
                                                                </label>
                                                                
                                                                <button type="button" onClick={() => removeIngredient(stepIdx, ingIdx)}>
                                                                    Remove
                                                                </button>
                                                                {fieldErrors.steps &&
                                                                    fieldErrors.steps[stepIdx] &&
                                                                    fieldErrors.steps[stepIdx].ingredients &&
                                                                    fieldErrors.steps[stepIdx].ingredients[ingIdx] && (
                                                                        <ul className="error-list">
                                                                            {Object.entries(fieldErrors.steps[stepIdx].ingredients[ingIdx])
                                                                                .filter(([_, msg]) => !!msg)
                                                                                .map(([field, msg], i) => (
                                                                                    <li key={field + i}>{msg}</li>
                                                                                ))}
                                                                        </ul>
                                                                    )
                                                                }
                                                            </div>
                                                        ))}
                                                        <button
                                                            type="button"
                                                            onClick={() => addIngredient(stepIdx)}
                                                            disabled={
                                                                step.ingredients.length > 0 &&
                                                                step.ingredients.some(
                                                                    ing => !ing.ingredient_id || !ing.quantity ||
                                                                        (fieldErrors.steps &&
                                                                            fieldErrors.steps[stepIdx] &&
                                                                            fieldErrors.steps[stepIdx].ingredients &&
                                                                            fieldErrors.steps[stepIdx].ingredients[step.ingredients.indexOf(ing)] &&
                                                                            (fieldErrors.steps[stepIdx].ingredients[step.ingredients.indexOf(ing)].ingredient_id ||
                                                                                fieldErrors.steps[stepIdx].ingredients[step.ingredients.indexOf(ing)].quantity)
                                                                        )
                                                                )
                                                            }
                                                        >
                                                            Add Ingredient
                                                        </button>
                                                    </div>
                                                    {recipeData.steps.length > 1 && (
                                                        <div className="remove-step-row">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeStep(stepIdx)}
                                                            >
                                                                Remove Step
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                    <button
                        type="button"
                        onClick={addStep}
                        disabled={
                            recipeData.steps.length === 0 ||
                            !recipeData.steps[recipeData.steps.length - 1].step_instructions.trim() ||
                            (
                                recipeData.steps[recipeData.steps.length - 1].ingredients.length > 0 &&
                                !allIngredientsValid(recipeData.steps.length - 1)
                            ) ||
                            hasStepErrors(recipeData.steps.length - 1)
                        }
                    >
                        Add Step
                    </button>
                    <div className="submit-row">
                        <button
                            type="submit"
                            disabled={
                                isSubmitting ||
                                hasAnyError ||
                                !recipeData.recipeName.trim() ||
                                recipeData.steps.length === 0 ||
                                recipeData.steps.some(
                                    step =>
                                        !step.step_instructions.trim() ||
                                        (step.ingredients && step.ingredients.some(
                                            ing => !ing.ingredient_id || !ing.quantity
                                        ))
                                )
                            }
                        >
                            {isSubmitting
                                ? 'Saving...'
                                : recipeId
                                    ? 'Update Recipe'
                                    : 'Create Recipe'}
                            </button>
                            <button
    type="button"
    className="reset-row"
    onClick={() => {
        if (recipeId) {
            // If editing, reload original recipe data
            dispatch(setStatus('loading'));
            fetchRecipeById(recipeId).then(recipeRes => {
                const recipe = recipeRes.data.recipe || recipeRes.data;
                setRecipeData({
                    recipeName: recipe.recipe_name,
                    steps: recipe.steps.map((step) => ({
                        step_number: step.step_number,
                        step_instructions: step.step_instructions,
                        ingredients: (step.ingredients || []).map((ing) => ({
                            ingredient_id: ing.ingredient_id,
                            quantity: ing.quantity,
                            unit: ing.unit,
                        })),
                    })),
                    ingredientsList: reduxIngredientsList,
                });
                setOriginalRecipeName(recipe.recipe_name);
                setFieldErrors([]);
                setNameStatus('');
                setSuccessMessage('');
                dispatch(setStatus('succeeded'));
            });
        } else {
            // If creating, reset to initial blank state
            setRecipeData({
                ...initialRecipeData,
                ingredientsList: reduxIngredientsList,
            });
            setFieldErrors([]);
            setNameStatus('');
            setSuccessMessage('');
        }
    }}
>
    Reset
                        </button>
                    </div>                   
                    
                        {successMessage && (
                        <div className="success-message">{successMessage}</div>
                    )}
                </form>
            )}

        </div>
    );
};

export default RecipeForm;