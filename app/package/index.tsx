import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { COLORS, TYPOGRAPHY } from '../../src/theme/theme';

import { PremiumPackageCard } from '../../src/components/PremiumPackageCard';
import { PremiumBottomSheet } from '../../src/components/PremiumBottomSheet';

import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../src/services/api';

export default function PackagesScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isFilterSheetOpen, setFilterSheetOpen] = useState(false);
  const [sampleTypeFilter, setSampleTypeFilter] = useState<'ALL' | 'HOME' | 'LAB'>('ALL');

const { data: packages = [] } = useQuery({
    queryKey: ['packages'],
    queryFn: apiService.getAllPackages,
  });

  const categories = React.useMemo(() => {
    const seen = new Set<string>();
    const cats: { id: string; name: string }[] = [{ id: 'all', name: 'All' }];
    for (const pkg of packages as any[]) {
      if (pkg.categoryId && pkg.categoryName && !seen.has(pkg.categoryId)) {
        seen.add(pkg.categoryId);
        cats.push({ id: pkg.categoryId, name: pkg.categoryName });
      }
    }
    return cats;
  }, [packages]);

  const filteredPackages = packages.filter((pkg: any) => {
    const matchesQuery = pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (pkg.subtitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (pkg.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' ? true : pkg.categoryId === selectedCategory;
    
    let matchesSampleType = true;
    if (sampleTypeFilter === 'HOME') matchesSampleType = pkg.homeCollection === true;
    else if (sampleTypeFilter === 'LAB') matchesSampleType = pkg.homeCollection === false;

    return matchesQuery && matchesCategory && matchesSampleType;
  });

  const renderCategoryChips = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
      {categories.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        return (
          <TouchableOpacity 
            key={cat.id} 
            style={[styles.chip, isSelected && styles.activeChip]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text style={[styles.chipText, isSelected && styles.activeChipText]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Sticky Top Header */}
      <View style={styles.topHeaderBg}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textLight} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Health Packages</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={22} color={COLORS.textLight} style={{ opacity: 0.7 }} />
            <TextInput
              style={styles.searchText}
              placeholder='Search Packages...'
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons name="close-circle" size={20} color={COLORS.textLight} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterSheetOpen(true)}>
            <MaterialCommunityIcons name="tune" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Chips */}
      <View style={styles.chipsContainer}>
        {renderCategoryChips()}
      </View>

      {/* Results List */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsCount}>{filteredPackages.length} health packages found</Text>
        <FlatList
          data={filteredPackages}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }: { item: any }) => (
            <PremiumPackageCard 
              packageData={item} 
              horizontal={false} 
              onPress={() => router.push(`/package/${item.id}`)} 
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="package-variant" size={64} color={COLORS.border} />
              <Text style={styles.emptyTitle}>No packages found</Text>
              <Text style={styles.emptyText}>Try adjusting your search query or categories.</Text>
            </View>
          }
        />
      </View>

      {/* Simple Filter Bottom Sheet */}
      <PremiumBottomSheet visible={isFilterSheetOpen} onClose={() => setFilterSheetOpen(false)}>
        <Text style={styles.sheetTitle}>Sort & Filter</Text>
        
        <Text style={styles.filterSectionTitle}>Sample Type</Text>
        <View style={styles.filterRow}>
          <TouchableOpacity 
            style={[styles.filterChip, sampleTypeFilter === 'HOME' && styles.filterChipActive]}
            onPress={() => setSampleTypeFilter(sampleTypeFilter === 'HOME' ? 'ALL' : 'HOME')}
          >
            <Text style={sampleTypeFilter === 'HOME' ? styles.filterChipTextActive : styles.filterChipText}>Home Collection</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterChip, sampleTypeFilter === 'LAB' && styles.filterChipActive]}
            onPress={() => setSampleTypeFilter(sampleTypeFilter === 'LAB' ? 'ALL' : 'LAB')}
          >
            <Text style={sampleTypeFilter === 'LAB' ? styles.filterChipTextActive : styles.filterChipText}>Lab Test Only</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.applyFilterBtn} onPress={() => setFilterSheetOpen(false)}>
          <Text style={styles.applyFilterText}>Apply Filter</Text>
        </TouchableOpacity>
      </PremiumBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topHeaderBg: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textLight,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginRight: 12,
  },
  searchText: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.textLight,
    marginLeft: 8,
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipsContainer: {
    paddingVertical: 16,
  },
  chipScroll: {
    paddingHorizontal: 16,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    backgroundColor: COLORS.surface,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeChip: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  activeChipText: {
    color: COLORS.textLight,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  resultsCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textDark,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  sheetTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textDark,
    marginBottom: 24,
  },
  filterSectionTitle: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.textDark,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    marginRight: 10,
    marginBottom: 10,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textDark,
  },
  filterChipTextActive: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    fontWeight: 'bold',
  },
  applyFilterBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 40,
  },
  applyFilterText: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.textLight,
    fontWeight: 'bold',
  }
});
