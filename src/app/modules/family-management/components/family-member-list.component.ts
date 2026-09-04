import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FamilyMemberService } from '../services/family-member.service';
import {
  FamilyMember,
  Gender,
  Relationship,
  MemberStatus,
  AgeGroup,
  FamilyStatistics,
  FamilyMemberFilter,
  FamilyMemberListResponse,
  FamilyMemberResponse
} from '../models/family-member.model';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-family-member-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './family-member-list.component.html',
  styleUrls: ['./family-member-list.component.scss']
})
export class FamilyMemberListComponent implements OnInit {
  members: FamilyMember[] = [];
  filteredMembers: FamilyMember[] = [];
  statistics: FamilyStatistics | null = null;
  
  // View options
  viewMode: 'card' | 'table' | 'family-tree' = 'card';
  selectedMember: FamilyMember | null = null;
  showDetailModal = false;
  showAddModal = false;
  showEditModal = false;
  
  // Filter options
  searchTerm = '';
  filterUnitId = '';
  filterRelationship: Relationship | '' = '';
  filterGender: Gender | '' = '';
  filterAgeGroup: AgeGroup | '' = '';
  filterStatus: MemberStatus | '' = '';
  filterHasGateAccess: boolean | null = null;
  
  // Enums for template
  relationships = Object.values(Relationship);
  genders = Object.values(Gender);
  ageGroups = Object.values(AgeGroup);
  statuses = Object.values(MemberStatus);
  
  // Loading state
  isLoading = false;
  
  // Group by unit
  groupByUnit = false;
  groupedMembers: { [unitId: string]: FamilyMember[] } = {};

  /** Unit ids for grouped card / family-tree views. */
  get groupedUnitIds(): string[] {
    return Object.keys(this.groupedMembers);
  }

  constructor(
    private familyService: FamilyMemberService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadMembers();
    this.loadStatistics();
  }

  loadMembers(): void {
    this.isLoading = true;
    this.familyService.getAllMembers().subscribe({
      next: (response: FamilyMemberListResponse) => {
        if (response.success) {
          this.members = response.members;
          this.applyFilters();
        } else if (response.message) {
          console.warn(response.message);
        }
        this.isLoading = false;
      },
      error: (error: unknown) => {
        console.error('Error loading members:', error);
        this.isLoading = false;
      }
    });
  }

  loadStatistics(): void {
    this.familyService.getFamilyStatistics().subscribe({
      next: (stats: FamilyStatistics) => {
        this.statistics = stats;
      },
      error: (error: unknown) => {
        console.error('Error loading statistics:', error);
      }
    });
  }

  applyFilters(): void {
    const filter: FamilyMemberFilter = {
      unitId: this.filterUnitId || undefined,
      relationship: this.filterRelationship || undefined,
      gender: this.filterGender || undefined,
      ageGroup: this.filterAgeGroup || undefined,
      status: this.filterStatus || undefined,
      hasGateAccess: this.filterHasGateAccess !== null ? this.filterHasGateAccess : undefined,
      searchTerm: this.searchTerm || undefined
    };

    this.familyService.searchMembers(filter).subscribe({
      next: (response: FamilyMemberListResponse) => {
        if (response.success) {
          this.filteredMembers = response.members;
          if (this.groupByUnit) {
            this.updateGroupedMembers();
          }
        }
      }
    });
  }

  updateGroupedMembers(): void {
    this.groupedMembers = {};
    this.filteredMembers.forEach(member => {
      if (!this.groupedMembers[member.unitId]) {
        this.groupedMembers[member.unitId] = [];
      }
      this.groupedMembers[member.unitId].push(member);
    });
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterUnitId = '';
    this.filterRelationship = '';
    this.filterGender = '';
    this.filterAgeGroup = '';
    this.filterStatus = '';
    this.filterHasGateAccess = null;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  toggleGroupByUnit(): void {
    this.groupByUnit = !this.groupByUnit;
    if (this.groupByUnit) {
      this.updateGroupedMembers();
    }
  }

  viewDetails(member: FamilyMember): void {
    this.selectedMember = member;
    this.showDetailModal = true;
  }

  closeModal(): void {
    this.showDetailModal = false;
    this.showAddModal = false;
    this.showEditModal = false;
    this.selectedMember = null;
  }

  openAddModal(): void {
    this.showAddModal = true;
  }

  openEditModal(member: FamilyMember): void {
    this.selectedMember = member;
    this.showEditModal = true;
  }

  deleteMember(member: FamilyMember): void {
    if (member.isPrimaryResident) {
      this.toast.warning('Cannot delete primary resident. Transfer ownership first.');
      return;
    }

    this.familyService.deleteMember(member.id).subscribe({
      next: (response: FamilyMemberResponse) => {
        if (response.success) {
          this.toast.warning(`${member.fullName} removed from family.`);
          this.loadMembers();
          this.loadStatistics();
          this.closeModal();
        } else {
          this.toast.error(response.message || 'Could not delete family member.');
        }
      },
      error: (error: unknown) => {
        console.error('Error deleting member:', error);
        this.toast.error('Failed to delete family member.');
      }
    });
  }

  toggleGateAccess(member: FamilyMember): void {
    this.familyService.toggleAccess(member.id, 'gate').subscribe({
      next: (response: FamilyMemberResponse) => {
        if (response.success) {
          member.hasGateAccess = !member.hasGateAccess;
        }
      }
    });
  }

  toggleAmenityAccess(member: FamilyMember): void {
    this.familyService.toggleAccess(member.id, 'amenity').subscribe({
      next: (response: FamilyMemberResponse) => {
        if (response.success) {
          member.hasAmenityAccess = !member.hasAmenityAccess;
        }
      }
    });
  }

  // Helper methods
  getAgeGroupLabel(age: number): string {
    if (age <= 2) return 'Infant';
    if (age <= 12) return 'Child';
    if (age <= 19) return 'Teenager';
    if (age <= 59) return 'Adult';
    return 'Senior';
  }

  getAgeGroupIcon(age: number): string {
    if (age <= 2) return '👶';
    if (age <= 12) return '🧒';
    if (age <= 19) return '🧑';
    if (age <= 59) return '👨';
    return '👴';
  }

  getRelationshipIcon(relationship: Relationship): string {
    const icons: { [key: string]: string } = {
      [Relationship.SELF]: '👤',
      [Relationship.SPOUSE]: '💑',
      [Relationship.FATHER]: '👨‍🦳',
      [Relationship.MOTHER]: '👩‍🦳',
      [Relationship.SON]: '👦',
      [Relationship.DAUGHTER]: '👧',
      [Relationship.BROTHER]: '👦',
      [Relationship.SISTER]: '👧',
      [Relationship.GRANDFATHER]: '👴',
      [Relationship.GRANDMOTHER]: '👵',
      [Relationship.GRANDSON]: '👦',
      [Relationship.GRANDDAUGHTER]: '👧'
    };
    return icons[relationship] || '👤';
  }

  formatLabel(text: string): string {
    return text.replace(/_/g, ' ');
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  getStatusClass(status: MemberStatus): string {
    const classes: { [key: string]: string } = {
      [MemberStatus.ACTIVE]: 'status-active',
      [MemberStatus.INACTIVE]: 'status-inactive',
      [MemberStatus.TEMPORARY_AWAY]: 'status-away',
      [MemberStatus.MOVED_OUT]: 'status-moved',
      [MemberStatus.DECEASED]: 'status-deceased'
    };
    return classes[status] || '';
  }

  getGenderIcon(gender: Gender): string {
    const icons: { [key: string]: string } = {
      [Gender.MALE]: '♂',
      [Gender.FEMALE]: '♀',
      [Gender.OTHER]: '⚧',
      [Gender.PREFER_NOT_TO_SAY]: '•'
    };
    return icons[gender] || '•';
  }
}
