import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({ usePathname: () => '/admin/blogs/new' }));

import { PageHeader, Field } from './index';

describe('admin ui', () => {
    it('builds the prompt path from the pathname', () => {
        const { container } = render(<PageHeader command="edit" title="New post" />);
        expect(container.querySelector('.adm-prompt').textContent).toBe('admin@aiyu:~/blogs/new$ edit');
    });

    it('ties label, help and error to the control', () => {
        render(
            <Field label="Title" help="Shown in search." error="Add a title.">
                <input />
            </Field>
        );
        const input = screen.getByLabelText('Title');
        expect(input).toHaveAccessibleDescription('Add a title. Shown in search.');
        expect(input).toHaveAttribute('aria-invalid', 'true');
    });
});
