import { useState, useEffect } from 'react';
import { CATEGORIES as DEFAULT_CATEGORIES } from '../types';
import type { TransactionType } from '../types';
import { supabase } from '../lib/supabase';

export function useCategories(userId?: string) {
    const [categories, setCategories] = useState<{ [key in TransactionType]: string[] }>({
        income: [],
        expense: []
    });

    useEffect(() => {
        if (!userId) {
            setCategories({ income: [], expense: [] });
            return;
        }

        const fetchCategories = async () => {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .eq('user_id', userId);

            if (error) {
                console.error('Error fetching categories:', error);
                // Fallback to defaults if error but careful not to overwrite user data silently
                // But for now, we just merge db categories with defaults?
                // Or simply show defaults + user categories.
            }

            const dbCategories = data || [];

            // Merge defaults with DB categories.
            // DB table stores individual category rows.
            // UI expects { income: string[], expense: string[] }

            const incomeCats = [...DEFAULT_CATEGORIES.income];
            const expenseCats = [...DEFAULT_CATEGORIES.expense];

            dbCategories.forEach((c: any) => {
                if (c.type === 'income' && !incomeCats.includes(c.name)) {
                    incomeCats.push(c.name);
                } else if (c.type === 'expense' && !expenseCats.includes(c.name)) {
                    expenseCats.push(c.name);
                }
            });

            setCategories({
                income: incomeCats,
                expense: expenseCats
            });
        };

        fetchCategories();

        // Subscribe to changes
        const subscription = supabase
            .channel('categories_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `user_id=eq.${userId}` }, () => {
                fetchCategories();
            })
            .subscribe();

        return () => { subscription.unsubscribe(); }

    }, [userId]);


    const addCategory = async (type: TransactionType, category: string) => {
        if (!userId || categories[type].includes(category)) return;

        const { error } = await supabase
            .from('categories')
            .insert({
                user_id: userId,
                name: category,
                type: type
            });

        if (error) {
            console.error('Error adding category:', error);
            alert('Error al agregar categoría: ' + error.message);
        }
    };

    const deleteCategory = async (type: TransactionType, category: string) => {
        if (!userId) return;

        // Cannot delete default categories
        if (DEFAULT_CATEGORIES[type].includes(category)) {
            alert('No puedes eliminar categorías predeterminadas.');
            return;
        }

        const { error } = await supabase
            .from('categories')
            .delete()
            .match({ user_id: userId, name: category, type });

        if (error) {
            console.error('Error deleting category:', error);
            alert('Error al eliminar categoría: ' + error.message);
        }
    };

    return { categories, addCategory, deleteCategory };
}
