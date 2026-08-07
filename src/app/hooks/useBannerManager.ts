import { useState, useCallback, useEffect } from 'react';
import {
  BannerColumn,
  BannerContent,
  BannerFormat,
  TextElement,
  SQUARE_FORMATS,
  HORIZONTAL_FORMATS,
  VERTICAL_FORMATS,
} from '../types/banner';
import { computeSmartLayout, computeSmartLayoutFromReference } from '../utils/smart-positioning';
import { loadProjectFromLocalStorage, saveProjectToLocalStorage } from '../utils/project-storage';

function defaultColumns(): BannerColumn[] {
  return [
    {
      id: 'col-1',
      category: 'square',
      masterFormat: SQUARE_FORMATS[3], // Use 250x250 as base format
      childFormats: [], // Start with empty children - user will add them progressively
    },
  ];
}

export function useBannerManager(initialContent: BannerContent) {
  // Restore the last session's autosaved project (lazy — reads storage once)
  const [restored] = useState(() => loadProjectFromLocalStorage());

  const [columns, setColumns] = useState<BannerColumn[]>(
    () => restored?.columns ?? defaultColumns(),
  );

  const [bannerContents, setBannerContents] = useState<Map<string, BannerContent>>(
    () => restored?.contents ?? new Map([[SQUARE_FORMATS[3].id, initialContent]]),
  );

  const [selectedFormat, setSelectedFormat] = useState<BannerFormat | null>(null);

  // Thumbnails for all banners (pre-rendered)
  const [bannerThumbnails, setBannerThumbnails] = useState<Map<string, string>>(new Map());

  // Autosave (debounced) — the whole board survives reloads
  useEffect(() => {
    const timer = setTimeout(() => saveProjectToLocalStorage(columns, bannerContents), 800);
    return () => clearTimeout(timer);
  }, [columns, bannerContents]);

  // Replace the whole project (JSON import, or reset to a fresh board)
  const replaceProject = useCallback(
    (newColumns: BannerColumn[] | null, newContents: Map<string, BannerContent> | null) => {
      setColumns(newColumns ?? defaultColumns());
      setBannerContents(newContents ?? new Map([[SQUARE_FORMATS[3].id, { ...initialContent }]]));
      setSelectedFormat(null);
      setBannerThumbnails(new Map());
    },
    [initialContent],
  );

  /**
   * Build a fresh board from a campaign brief (the wizard's output): the Super
   * Master plus optional horizontal/vertical columns, all seeded from the same
   * design. Each master runs the full zone-based layout for its own format
   * rather than reference scaling — the brief carries no manual positioning to
   * preserve, so every format deserves its own composition. Applied as one
   * atomic swap so no propagation runs against a half-updated board.
   */
  const startCampaign = useCallback(
    (content: BannerContent, options: { horizontal?: boolean; vertical?: boolean } = {}) => {
      const masters: Array<{
        id: string;
        category: BannerColumn['category'];
        format: BannerFormat;
      }> = [{ id: 'col-1', category: 'square', format: SQUARE_FORMATS[3] }];

      // Recognizable social masters, looked up by id so a catalog reorder
      // can't silently change what a new campaign starts with.
      const horizontalMaster =
        HORIZONTAL_FORMATS.find((f) => f.id === 'hz-1200x628') ?? HORIZONTAL_FORMATS[0];
      const verticalMaster =
        VERTICAL_FORMATS.find((f) => f.id === 'vt-1080x1920') ?? VERTICAL_FORMATS[0];

      if (options.horizontal) {
        masters.push({ id: 'col-horizontal', category: 'horizontal', format: horizontalMaster });
      }
      if (options.vertical) {
        masters.push({ id: 'col-vertical', category: 'vertical', format: verticalMaster });
      }

      const newColumns: BannerColumn[] = masters.map((m) => ({
        id: m.id,
        category: m.category,
        masterFormat: m.format,
        childFormats: [],
      }));
      const contents = new Map<string, BannerContent>(
        masters.map((m) => [m.format.id, computeSmartLayout({ ...content }, m.format)]),
      );

      setColumns(newColumns);
      setBannerContents(contents);
      setSelectedFormat(null);
      setBannerThumbnails(new Map());
    },
    [],
  );

  // Update thumbnail for a specific banner
  const updateBannerThumbnail = useCallback((formatId: string, dataUrl: string) => {
    setBannerThumbnails((prev) => {
      const newThumbnails = new Map(prev);
      newThumbnails.set(formatId, dataUrl);
      return newThumbnails;
    });
  }, []);

  // Add a new column (horizontal or vertical). An explicit master format can
  // be provided (e.g. when the user picks a specific size from the Sizes panel).
  const addColumn = useCallback((category: 'horizontal' | 'vertical', master?: BannerFormat) => {
    const formats = category === 'horizontal' ? HORIZONTAL_FORMATS : VERTICAL_FORMATS;
    // Defaults when the caller doesn't name a size: Large Rectangle (336x280)
    // for horizontal, Skyscraper (120x600) for vertical — index 16 and 0.
    const masterFormatIndex = category === 'horizontal' ? 16 : 0;
    const masterFormat = master ?? formats[masterFormatIndex];

    const newColumn: BannerColumn = {
      id: `col-${Date.now()}`,
      category,
      masterFormat: masterFormat,
      childFormats: [], // Start with empty children - progressive workflow
    };

    setColumns((prev) => [...prev, newColumn]);

    // Initialize content for new column's master format only
    setBannerContents((prev) => {
      const newContents = new Map(prev);
      if (!newContents.has(masterFormat.id)) {
        // Inherit from Super Master, adapting the layout to the new format's
        // dimensions so elements distribute correctly instead of being a raw copy
        const superMasterContent = prev.get(SQUARE_FORMATS[3].id);
        newContents.set(
          masterFormat.id,
          computeSmartLayoutFromReference(
            { ...superMasterContent! },
            masterFormat,
            SQUARE_FORMATS[3],
          ),
        );
      }
      return newContents;
    });
  }, []);

  // Delete a column
  const deleteColumn = useCallback(
    (columnIndex: number) => {
      if (columnIndex === 0) return; // Cannot delete the first column
      const deletedColumn = columns[columnIndex];
      if (!deletedColumn) return;

      setColumns((prev) => prev.filter((_, index) => index !== columnIndex));

      // Clean up banner contents for deleted column
      setBannerContents((prevContents) => {
        const newContents = new Map(prevContents);
        [deletedColumn.masterFormat, ...deletedColumn.childFormats].forEach((format) => {
          newContents.delete(format.id);
        });
        return newContents;
      });

      // Deselect if selected banner was in deleted column
      if (selectedFormat) {
        const allFormats = [deletedColumn.masterFormat, ...deletedColumn.childFormats];
        if (allFormats.some((f) => f.id === selectedFormat.id)) {
          setSelectedFormat(null);
        }
      }
    },
    [columns, selectedFormat],
  );

  // Add a child banner to a column
  const addChildBanner = useCallback(
    (columnIndex: number, format: BannerFormat) => {
      const column = columns[columnIndex];
      if (!column) return;
      // Guard against duplicates (same size can only be on the board once)
      if (
        column.childFormats.some((f) => f.id === format.id) ||
        column.masterFormat.id === format.id
      ) {
        return;
      }

      setColumns((prev) =>
        prev.map((col, index) =>
          index === columnIndex ? { ...col, childFormats: [...col.childFormats, format] } : col,
        ),
      );

      // Initialize content for new banner, adapting the master's layout to the
      // child's dimensions (proportional scaling or zone-based re-layout)
      setBannerContents((prevContents) => {
        const newContents = new Map(prevContents);
        const masterContent = prevContents.get(column.masterFormat.id);
        newContents.set(
          format.id,
          computeSmartLayoutFromReference({ ...masterContent! }, format, column.masterFormat),
        );
        return newContents;
      });
    },
    [columns],
  );

  // Delete a child banner from a column
  const deleteChildBanner = useCallback(
    (columnIndex: number, childIndex: number) => {
      const column = columns[columnIndex];
      const deletedFormat = column?.childFormats[childIndex];
      if (!deletedFormat) return;

      setColumns((prev) =>
        prev.map((col, index) =>
          index === columnIndex
            ? { ...col, childFormats: col.childFormats.filter((_, i) => i !== childIndex) }
            : col,
        ),
      );

      // Clean up content
      setBannerContents((prevContents) => {
        const newContents = new Map(prevContents);
        newContents.delete(deletedFormat.id);
        return newContents;
      });

      // Deselect if deleted
      if (selectedFormat?.id === deletedFormat.id) {
        setSelectedFormat(null);
      }
    },
    [columns, selectedFormat],
  );

  // Update banner content with master-child propagation.
  // Propagated content is re-laid-out for each target format so elements
  // distribute correctly in every frame instead of receiving a raw copy.
  const updateBannerContent = useCallback(
    (formatId: string, content: BannerContent) => {
      setBannerContents((prev) => {
        const newContents = new Map(prev);
        newContents.set(formatId, content);

        // Format lookup for adapting layouts during propagation
        const formatById = new Map<string, BannerFormat>();
        columns.forEach((col) => {
          formatById.set(col.masterFormat.id, col.masterFormat);
          col.childFormats.forEach((f) => formatById.set(f.id, f));
        });

        const adaptTo = (targetId: string, sourceFormat: BannerFormat): BannerContent => {
          const targetFormat = formatById.get(targetId);
          if (!targetFormat || targetFormat.id === sourceFormat.id) return { ...content };
          return computeSmartLayoutFromReference({ ...content }, targetFormat, sourceFormat);
        };

        // Check if this is the Super Master (first square banner)
        const isSuperMaster = formatId === SQUARE_FORMATS[3].id;
        if (isSuperMaster) {
          // Propagate to ALL banners
          newContents.forEach((_, id) => {
            if (id !== formatId) {
              newContents.set(id, adaptTo(id, SQUARE_FORMATS[3]));
            }
          });
          return newContents;
        }

        // Check if this is a column master
        const columnIndex = columns.findIndex((col) => col.masterFormat.id === formatId);
        if (columnIndex !== -1) {
          // Propagate to children in this column
          const column = columns[columnIndex];
          column.childFormats.forEach((childFormat) => {
            newContents.set(childFormat.id, adaptTo(childFormat.id, column.masterFormat));
          });
        }

        return newContents;
      });
    },
    [columns],
  );

  // Patch per-text style fields WITHOUT master→child propagation.
  // Used by the auto-contrast engine: each banner gets its own adjustments
  // (same design can need different text colors on different crops).
  const patchTextStyles = useCallback(
    (formatId: string, updates: Map<string, Partial<TextElement>>) => {
      setBannerContents((prev) => {
        const content = prev.get(formatId);
        if (!content) return prev;

        let changed = false;
        const texts = content.texts.map((text) => {
          const patch = updates.get(text.id);
          if (!patch) return text;
          const differs = Object.entries(patch).some(
            ([key, value]) => text[key as keyof typeof text] !== value,
          );
          if (!differs) return text;
          changed = true;
          return { ...text, ...patch };
        });

        if (!changed) return prev;
        const newContents = new Map(prev);
        newContents.set(formatId, { ...content, texts });
        return newContents;
      });
    },
    [],
  );

  // Get all banners for export
  const getAllBanners = useCallback(() => {
    const allBanners: Array<{ id: string; format: BannerFormat }> = [];

    columns.forEach((column) => {
      allBanners.push({
        id: column.masterFormat.id,
        format: column.masterFormat,
      });
      column.childFormats.forEach((format) => {
        allBanners.push({
          id: format.id,
          format,
        });
      });
    });

    return allBanners;
  }, [columns]);

  // Get banners for a specific column
  const getColumnBanners = useCallback(
    (columnIndex: number) => {
      const column = columns[columnIndex];
      if (!column) return [];

      return [
        { id: column.masterFormat.id, format: column.masterFormat },
        ...column.childFormats.map((format) => ({
          id: format.id,
          format,
        })),
      ];
    },
    [columns],
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SMART POSITIONING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Apply smart positioning to a single banner.
   * Uses zone-based layout adapted to the banner's format.
   */
  const applySmartPositioningSingle = useCallback(
    (formatId: string) => {
      const format = columns
        .flatMap((c) => [c.masterFormat, ...c.childFormats])
        .find((f) => f.id === formatId);
      if (!format) return;

      setBannerContents((prev) => {
        const current = prev.get(formatId);
        if (!current) return prev;
        const newContents = new Map(prev);
        newContents.set(formatId, computeSmartLayout(current, format));
        return newContents;
      });
    },
    [columns],
  );

  /**
   * Apply smart positioning to ALL banners.
   * Each banner is independently laid out for its own format dimensions.
   * Uses the Super Master as reference — if the target has a similar aspect
   * ratio, proportional scaling is used; otherwise zone-based layout.
   */
  const applySmartPositioningAll = useCallback(() => {
    const superMasterFormat = columns[0]?.masterFormat;
    if (!superMasterFormat) return;

    setBannerContents((prev) => {
      const superMasterContent = prev.get(superMasterFormat.id);
      if (!superMasterContent) return prev;

      const newContents = new Map(prev);

      // First: apply smart layout to the Super Master itself
      newContents.set(
        superMasterFormat.id,
        computeSmartLayout(superMasterContent, superMasterFormat),
      );

      // Then: re-lay-out every other banner for its OWN format.
      //
      // This must NOT use computeSmartLayoutFromReference: that function
      // expects content expressed in the reference format's coordinates and
      // rescales it, but each banner's content is already in its own
      // coordinates. Feeding it here multiplied a Story's y values by
      // 1920/250, pushing elements thousands of pixels off the canvas.
      // computeSmartLayout re-derives positions from scratch, so it is both
      // correct and idempotent.
      columns.forEach((column) => {
        const allFormats = [column.masterFormat, ...column.childFormats];
        allFormats.forEach((format) => {
          if (format.id === superMasterFormat.id) return; // already done
          const content = prev.get(format.id);
          if (!content) return;
          newContents.set(format.id, computeSmartLayout(content, format));
        });
      });

      return newContents;
    });
  }, [columns]);

  return {
    columns,
    bannerContents,
    selectedFormat,
    setSelectedFormat,
    addColumn,
    deleteColumn,
    addChildBanner,
    deleteChildBanner,
    updateBannerContent,
    getAllBanners,
    getColumnBanners,
    updateBannerThumbnail,
    bannerThumbnails,
    applySmartPositioningSingle,
    applySmartPositioningAll,
    patchTextStyles,
    replaceProject,
    startCampaign,
    /** True when this session restored an autosaved board */
    hasRestoredProject: restored !== null,
  };
}
