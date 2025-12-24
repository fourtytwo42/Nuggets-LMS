import { render, screen, fireEvent } from '@testing-library/react';
import NarrativeTree from '@/components/learner/NarrativeTree';

describe('NarrativeTree', () => {
  const mockNodes = [
    {
      id: 'node-1',
      title: 'Introduction',
      position: { x: 0, y: 0 },
      choices: [{ id: 'choice-1', text: 'Continue', nextNodeId: 'node-2' }],
    },
    {
      id: 'node-2',
      title: 'Main Topic',
      position: { x: 100, y: 100 },
      choices: [],
    },
  ];

  it('should render narrative tree', () => {
    render(<NarrativeTree nodes={mockNodes} />);
    expect(screen.getByText('Learning Path')).toBeInTheDocument();
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Main Topic')).toBeInTheDocument();
  });

  it('should highlight current node', () => {
    render(<NarrativeTree nodes={mockNodes} currentNodeId="node-1" />);
    const node = screen.getByText('Introduction').closest('div');
    expect(node).toHaveClass('ring-2');
  });

  it('should call onNodeSelect when node is clicked', () => {
    const onNodeSelect = jest.fn();
    render(<NarrativeTree nodes={mockNodes} onNodeSelect={onNodeSelect} />);

    fireEvent.click(screen.getByText('Introduction'));

    expect(onNodeSelect).toHaveBeenCalledWith('node-1');
  });

  it('should show empty state when no nodes', () => {
    render(<NarrativeTree nodes={[]} />);
    expect(screen.getByText('No narrative nodes available')).toBeInTheDocument();
  });
});
